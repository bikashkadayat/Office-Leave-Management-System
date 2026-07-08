from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from audit.models import AuditLog
from users.models import User
from users.permissions import IsCheckerOrApprover
from . import services
from .models import Memo, MemoTemplate
from .permissions import (
    CanViewMemo,
    IsMemoApprover,
    IsMemoChecker,
    IsMemoMaker,
)
from .serializers import (
    MemoActionSerializer,
    MemoCreateSerializer,
    MemoDetailSerializer,
    MemoListSerializer,
    MemoTemplateSerializer,
)


class MemoViewSet(viewsets.ModelViewSet):
    """
    Memo CRUD plus workflow action endpoints. All state transitions are
    delegated to memos.services so this class stays thin.
    """
    permission_classes = [IsAuthenticated, CanViewMemo]

    def get_queryset(self):
        user = self.request.user
        qs = Memo.objects.select_related(
            "created_by", "current_reviewer", "current_approver"
        ).prefetch_related("approval_steps__actor")

        if user.role == User.Roles.ADMIN:
            return qs

        if user.role == User.Roles.MAKER:
            return qs.filter(created_by=user)

        if user.role == User.Roles.CHECKER:
            return qs.filter(
                Q(current_reviewer=user)
                | Q(status__in=[Memo.Status.SUBMITTED, Memo.Status.UNDER_REVIEW])
            ).distinct()

        if user.role == User.Roles.APPROVER:
            return qs.filter(
                Q(current_approver=user)
                | Q(status__in=[
                    Memo.Status.UNDER_REVIEW,
                    Memo.Status.APPROVED,
                    Memo.Status.REJECTED,
                ])
            ).distinct()

        return qs.none()

    def get_serializer_class(self):
        if self.action == "list":
            return MemoListSerializer
        if self.action == "create":
            return MemoCreateSerializer
        return MemoDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.MAKER, User.Roles.ADMIN]:
            raise PermissionDenied("Only makers can create memos.")
        memo_type = serializer.validated_data.get("memo_type", Memo.MemoType.GENERAL)
        memo_number = services.generate_memo_number(memo_type)
        memo = serializer.save(
            created_by=user,
            status=Memo.Status.DRAFT,
            memo_number=memo_number,
        )
        services.create_audit_log(
            user, AuditLog.Action.CREATE, instance=memo, request=self.request
        )

    def _detail_response(self, memo):
        serializer = MemoDetailSerializer(memo, context=self.get_serializer_context())
        return Response(serializer.data)

    def _action_comment(self, request):
        serializer = MemoActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data.get("comment", "")

    @action(detail=True, methods=["post"], url_path="submit",
            permission_classes=[IsAuthenticated, IsMemoMaker])
    def submit(self, request, pk=None):
        memo = self.get_object()
        result = services.submit_memo(memo, request.user, request=request)
        return self._detail_response(result)

    @action(detail=True, methods=["post"], url_path="review",
            permission_classes=[IsAuthenticated, IsMemoChecker])
    def review(self, request, pk=None):
        comment = self._action_comment(request)
        memo = self.get_object()
        result = services.review_memo(memo, request.user, comment, request=request)
        return self._detail_response(result)

    @action(detail=True, methods=["post"], url_path="approve",
            permission_classes=[IsAuthenticated, IsMemoApprover])
    def approve(self, request, pk=None):
        comment = self._action_comment(request)
        memo = self.get_object()
        result = services.approve_memo(memo, request.user, comment, request=request)
        return self._detail_response(result)

    @action(detail=True, methods=["post"], url_path="reject",
            permission_classes=[IsAuthenticated, IsCheckerOrApprover])
    def reject(self, request, pk=None):
        comment = self._action_comment(request)
        memo = self.get_object()
        result = services.reject_memo(memo, request.user, comment, request=request)
        return self._detail_response(result)

    @action(detail=True, methods=["post"], url_path="return",
            permission_classes=[IsAuthenticated, IsMemoChecker])
    def return_to_maker(self, request, pk=None):
        comment = self._action_comment(request)
        memo = self.get_object()
        result = services.return_memo(memo, request.user, comment, request=request)
        return self._detail_response(result)

    @action(detail=True, methods=["post"], url_path="cancel",
            permission_classes=[IsAuthenticated, IsMemoMaker])
    def cancel(self, request, pk=None):
        comment = self._action_comment(request)
        memo = self.get_object()
        result = services.cancel_memo(memo, request.user, comment, request=request)
        return self._detail_response(result)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        """Approved-memo PDF with letterhead, approval trail and verification QR."""
        from django.http import HttpResponse
        from django.utils.html import linebreaks
        from documents.models import IssuedDocument
        from documents.pdf import common_context, render_pdf
        from documents.services import issue_document

        memo = self.get_object()
        if memo.status != Memo.Status.APPROVED:
            return Response({"detail": "PDF is available only for approved memos."},
                            status=status.HTTP_409_CONFLICT)

        steps = list(memo.approval_steps.select_related("actor").all())
        approver = memo.current_approver
        author = memo.created_by

        def _name(u):
            return (u.get_full_name() or u.username) if u else "—"

        doc = issue_document(
            IssuedDocument.DocType.MEMO, "memo", memo, subject=memo.subject,
            issued_by=request.user, actors=[_name(s.actor) for s in steps if s.actor],
        )
        ctx = common_context(doc.document_number)
        ctx.update({
            "memo": memo,
            "to_name": _name(approver),
            "from_name": _name(author),
            "cc_name": "",
            "body_html": linebreaks(memo.body),
            "approver_name": _name(approver),
            "steps": [{
                "step_order": s.step_order,
                "get_action_display": s.get_action_display(),
                "actor_name": _name(s.actor),
                "acted_at": s.acted_at,
                "comment": s.comment,
            } for s in steps],
        })
        pdf_bytes = render_pdf("pdf/memo.html", ctx)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{doc.document_number}.pdf"'
        return response


class MemoTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to active templates for prefilling new memos."""
    permission_classes = [IsAuthenticated]
    serializer_class = MemoTemplateSerializer
    queryset = MemoTemplate.objects.filter(is_active=True)
