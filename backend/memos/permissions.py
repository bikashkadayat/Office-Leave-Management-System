from rest_framework import permissions

from users.models import User
from .models import Memo

# Sensitive memo types are never visible to the department "pool" - only the
# author, the assigned reviewer/approver and admins may see them (M1).
SENSITIVE_MEMO_TYPES = {Memo.MemoType.FINANCIAL, Memo.MemoType.HR}


def _is_admin(user):
    return getattr(user, "role", None) == User.Roles.ADMIN


def _same_department(user, obj):
    dept = getattr(user, "department", None)
    author_dept = getattr(obj.created_by, "department", None)
    return bool(dept) and dept == author_dept


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
        Checker  -> memos they review, plus a same-department review pool
        Approver -> memos assigned to them, plus a same-department pool
        Admin    -> everything

    The pool is scoped to the actor's department and excludes sensitive
    (financial/HR) memo types, so a checker/approver cannot browse another
    department's memos or any sensitive memo they are not assigned to (M1).
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
            if obj.current_reviewer_id == user.id:
                return True
            return self._in_pool(user, obj, self.CHECKER_POOL_STATUSES)

        if role == User.Roles.APPROVER:
            if obj.current_approver_id == user.id:
                return True
            return self._in_pool(user, obj, self.APPROVER_VISIBLE_STATUSES)

        return False

    def _in_pool(self, user, obj, statuses):
        return (
            obj.memo_type not in SENSITIVE_MEMO_TYPES
            and obj.status in statuses
            and _same_department(user, obj)
        )
