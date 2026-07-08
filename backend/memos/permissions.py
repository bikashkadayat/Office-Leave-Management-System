from rest_framework import permissions

from users.models import User


def _is_admin(user):
    return getattr(user, "role", None) == User.Roles.ADMIN


class IsMemoMaker(permissions.BasePermission):
    """Maker (or admin) role; object access limited to the memo's author."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            User.Roles.MAKER,
            User.Roles.ADMIN,
        ]

    def has_object_permission(self, request, view, obj):
        return _is_admin(request.user) or obj.created_by_id == request.user.id


class IsMemoChecker(permissions.BasePermission):
    """Checker (or admin) role; object access limited to the assigned reviewer."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            User.Roles.CHECKER,
            User.Roles.ADMIN,
        ]

    def has_object_permission(self, request, view, obj):
        return _is_admin(request.user) or obj.current_reviewer_id == request.user.id


class IsMemoApprover(permissions.BasePermission):
    """Approver (or admin) role; object access limited to the assigned approver."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            User.Roles.APPROVER,
            User.Roles.ADMIN,
        ]

    def has_object_permission(self, request, view, obj):
        return _is_admin(request.user) or obj.current_approver_id == request.user.id


class CanViewMemo(permissions.BasePermission):
    """
    Composite object-level read guard enforced on detail endpoints.

    Enforcing this at the object level (rather than trusting the queryset alone)
    closes IDOR gaps: even if an id leaks, DRF will 403 a user who is not
    entitled to the specific memo.

        Maker    -> own memos only
        Checker  -> memos they review, plus the shared review pool
        Approver -> memos assigned to them, plus anything under_review or later
        Admin    -> everything
    """

    # Statuses a memo has reached (or passed) the approver stage at.
    APPROVER_VISIBLE_STATUSES = {"under_review", "approved", "rejected"}
    # Statuses visible to checkers who are not the named reviewer (review pool).
    CHECKER_POOL_STATUSES = {"submitted", "under_review"}

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        role = user.role

        if role == User.Roles.ADMIN:
            return True

        # Phase 2: any role can author a memo, so the author can always view
        # (and manage) their own memo regardless of role or workflow stage.
        if obj.created_by_id == user.id:
            return True

        if role == User.Roles.MAKER:
            return obj.created_by_id == user.id

        if role == User.Roles.CHECKER:
            return (
                obj.current_reviewer_id == user.id
                or obj.status in self.CHECKER_POOL_STATUSES
            )

        if role == User.Roles.APPROVER:
            return (
                obj.current_approver_id == user.id
                or obj.status in self.APPROVER_VISIBLE_STATUSES
            )

        return False
