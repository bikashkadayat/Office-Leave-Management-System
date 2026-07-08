import pytest

from audit.models import AuditLog
from memos.models import Memo
from memos import services


@pytest.mark.django_db
def test_create_draft(api, maker):
    api.force_authenticate(maker)
    resp = api.post("/api/v1/memos/", {
        "title": "New memo",
        "subject": "Subject",
        "body": "Body content",
        "memo_type": Memo.MemoType.INTERNAL,
        "priority": Memo.Priority.NORMAL,
    })
    assert resp.status_code == 201, resp.data
    memo = Memo.objects.get()
    assert memo.status == Memo.Status.DRAFT
    assert memo.created_by_id == maker.id
    assert memo.memo_number.startswith("NIFN-INT-")
    assert AuditLog.objects.filter(action=AuditLog.Action.CREATE, object_id=str(memo.id)).exists()


@pytest.mark.django_db
def test_end_to_end_api_workflow(api, draft_memo, maker, checker, approver):
    # submit
    api.force_authenticate(maker)
    r = api.post(f"/api/v1/memos/{draft_memo.id}/submit/")
    assert r.status_code == 200, r.data
    assert r.data["status"] == Memo.Status.SUBMITTED

    # review
    api.force_authenticate(checker)
    r = api.post(f"/api/v1/memos/{draft_memo.id}/review/", {"comment": "Reviewed and forwarded"})
    assert r.status_code == 200, r.data
    assert r.data["status"] == Memo.Status.UNDER_REVIEW

    # approve
    api.force_authenticate(approver)
    r = api.post(f"/api/v1/memos/{draft_memo.id}/approve/", {"comment": "Approved"})
    assert r.status_code == 200, r.data
    assert r.data["status"] == Memo.Status.APPROVED
    assert len(r.data["approval_steps"]) == 3


@pytest.mark.django_db
def test_reject_via_api_requires_comment(api, draft_memo, maker, checker, approver):
    services.submit_memo(draft_memo, maker)
    services.review_memo(draft_memo, checker, comment="ok")

    api.force_authenticate(approver)
    # too-short comment rejected by serializer
    r = api.post(f"/api/v1/memos/{draft_memo.id}/reject/", {
        "action": "rejected", "comment": "no",
    })
    assert r.status_code == 400

    r = api.post(f"/api/v1/memos/{draft_memo.id}/reject/", {
        "action": "rejected", "comment": "Rejected: incomplete documentation.",
    })
    assert r.status_code == 200
    assert r.data["status"] == Memo.Status.REJECTED


@pytest.mark.django_db
def test_list_uses_light_serializer(api, draft_memo, maker):
    api.force_authenticate(maker)
    r = api.get("/api/v1/memos/")
    assert r.status_code == 200
    row = r.data["results"][0]
    # list payload must not carry body/attachment
    assert "body" not in row
    assert "attachment" not in row
    assert "memo_number" in row


@pytest.mark.django_db
def test_list_is_paginated(api, maker):
    api.force_authenticate(maker)
    r = api.get("/api/v1/memos/")
    assert r.status_code == 200
    assert set(["count", "next", "previous", "results"]).issubset(r.data.keys())


@pytest.mark.django_db
def test_templates_endpoint_returns_active_only(api, maker):
    from memos.models import MemoTemplate
    MemoTemplate.objects.create(name="Active", memo_type=Memo.MemoType.HR,
                                subject_template="s", body_template="b", is_active=True)
    MemoTemplate.objects.create(name="Inactive", memo_type=Memo.MemoType.HR,
                                subject_template="s", body_template="b", is_active=False)
    api.force_authenticate(maker)
    r = api.get("/api/v1/memo-templates/")
    assert r.status_code == 200
    names = [t["name"] for t in r.data["results"]]
    assert "Active" in names and "Inactive" not in names
