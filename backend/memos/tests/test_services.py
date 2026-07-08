import pytest
from rest_framework.exceptions import ValidationError

from audit.models import AuditLog
from memos.models import Memo, MemoApprovalStep
from memos import services


@pytest.mark.django_db
def test_generate_memo_number_format_and_increment():
    first = services.generate_memo_number(Memo.MemoType.HR)
    assert first.startswith("NIFN-HR-")
    assert first.endswith("-0001")

    Memo.objects.create(
        title="t", subject="s", body="b", memo_type=Memo.MemoType.HR,
        created_by=_a_user(), memo_number=first,
    )
    second = services.generate_memo_number(Memo.MemoType.HR)
    assert second.endswith("-0002")


def _a_user():
    from users.models import User
    return User.objects.create_user(
        username="numgen", email="numgen@nif.test", password="pass12345",
        role=User.Roles.MAKER, department="Finance",
    )


@pytest.mark.django_db
def test_full_happy_path(draft_memo, maker, checker, approver):
    # submit
    memo = services.submit_memo(draft_memo, maker)
    assert memo.status == Memo.Status.SUBMITTED
    assert memo.current_reviewer_id == checker.id
    assert memo.submitted_at is not None

    # review
    memo = services.review_memo(memo, checker, comment="Looks good")
    assert memo.status == Memo.Status.UNDER_REVIEW
    assert memo.current_approver_id == approver.id

    # approve
    memo = services.approve_memo(memo, approver, comment="Approved")
    assert memo.status == Memo.Status.APPROVED
    assert memo.finalized_at is not None

    # a step per transition + correct ordering
    steps = list(memo.approval_steps.order_by("step_order"))
    assert [s.action for s in steps] == [
        MemoApprovalStep.Action.SUBMITTED,
        MemoApprovalStep.Action.REVIEWED,
        MemoApprovalStep.Action.APPROVED,
    ]
    assert [s.step_order for s in steps] == [1, 2, 3]

    # audit trail written for each transition
    assert AuditLog.objects.filter(object_id=str(memo.id)).count() >= 3


@pytest.mark.django_db
def test_reject_path_requires_comment(draft_memo, maker, checker, approver):
    memo = services.submit_memo(draft_memo, maker)
    memo = services.review_memo(memo, checker, comment="ok")

    with pytest.raises(ValidationError):
        services.reject_memo(memo, approver, comment="short")

    memo = services.reject_memo(memo, approver, comment="Does not meet financial policy.")
    assert memo.status == Memo.Status.REJECTED
    assert AuditLog.objects.filter(action=AuditLog.Action.REJECT, object_id=str(memo.id)).exists()


@pytest.mark.django_db
def test_return_sends_back_to_draft(draft_memo, maker, checker):
    memo = services.submit_memo(draft_memo, maker)
    memo = services.return_memo(memo, checker, comment="Please add cost breakdown.")
    assert memo.status == Memo.Status.DRAFT
    assert memo.current_reviewer_id is None
    assert memo.submitted_at is None


@pytest.mark.django_db
def test_cancel_by_author(draft_memo, maker):
    memo = services.cancel_memo(draft_memo, maker)
    assert memo.status == Memo.Status.CANCELLED
    assert memo.approval_steps.filter(action=MemoApprovalStep.Action.CANCELLED).exists()


@pytest.mark.django_db
def test_submit_guard_wrong_actor(draft_memo, other_maker, checker):
    with pytest.raises(ValidationError):
        services.submit_memo(draft_memo, other_maker)


@pytest.mark.django_db
def test_review_guard_wrong_reviewer(draft_memo, maker, checker, other_checker, approver):
    memo = services.submit_memo(draft_memo, maker)
    with pytest.raises(ValidationError):
        services.review_memo(memo, other_checker, comment="nope")


@pytest.mark.django_db
def test_approve_guard_wrong_status(draft_memo, maker, checker, approver):
    memo = services.submit_memo(draft_memo, maker)  # still SUBMITTED, not UNDER_REVIEW
    with pytest.raises(ValidationError):
        services.approve_memo(memo, approver)


@pytest.mark.django_db
def test_financial_memo_escalates_to_admin(maker, approver, admin):
    from memos.services import generate_memo_number
    memo = Memo.objects.create(
        title="Vendor payment", subject="Pay", body="body",
        memo_type=Memo.MemoType.FINANCIAL, priority=Memo.Priority.NORMAL,
        status=Memo.Status.DRAFT, created_by=maker,
        memo_number=generate_memo_number(Memo.MemoType.FINANCIAL),
    )
    # no checker in this test -> submit would fail, so seed one
    from users.models import User
    User.objects.create_user(username="chk", email="chk@nif.test", password="pass12345",
                             role=User.Roles.CHECKER, department="Finance")
    memo = services.submit_memo(memo, maker)
    memo = services.review_memo(memo, memo.current_reviewer, comment="ok")
    # financial escalates to the admin acting as senior approver
    assert memo.current_approver_id == admin.id
