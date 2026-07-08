import pytest

from memos.models import Memo
from memos import services


@pytest.mark.django_db
def test_maker_cannot_see_others_memo(api, draft_memo, other_maker):
    api.force_authenticate(other_maker)
    resp = api.get(f"/api/v1/memos/{draft_memo.id}/")
    # not in queryset -> 404 (object filtered out before object-perm check)
    assert resp.status_code == 404


@pytest.mark.django_db
def test_author_can_see_own_memo(api, draft_memo, maker):
    api.force_authenticate(maker)
    resp = api.get(f"/api/v1/memos/{draft_memo.id}/")
    assert resp.status_code == 200
    assert resp.data["memo_number"] == draft_memo.memo_number


@pytest.mark.django_db
def test_admin_sees_everything(api, draft_memo, admin):
    api.force_authenticate(admin)
    resp = api.get(f"/api/v1/memos/{draft_memo.id}/")
    assert resp.status_code == 200


@pytest.mark.django_db
def test_checker_sees_submitted_pool(api, draft_memo, maker, checker, approver):
    services.submit_memo(draft_memo, maker)
    api.force_authenticate(checker)
    resp = api.get(f"/api/v1/memos/{draft_memo.id}/")
    assert resp.status_code == 200


@pytest.mark.django_db
def test_maker_cannot_review(api, draft_memo, maker, checker, approver):
    services.submit_memo(draft_memo, maker)
    api.force_authenticate(maker)
    resp = api.post(f"/api/v1/memos/{draft_memo.id}/review/", {"comment": "x"})
    assert resp.status_code == 403


@pytest.mark.django_db
def test_wrong_checker_cannot_review(api, draft_memo, maker, checker, other_checker, approver):
    services.submit_memo(draft_memo, maker)  # assigned to checker1
    api.force_authenticate(other_checker)
    resp = api.post(f"/api/v1/memos/{draft_memo.id}/review/", {"comment": "hijack"})
    # other_checker is a checker (passes role) but not the assigned reviewer -> object perm 403/404
    assert resp.status_code in (403, 404)


@pytest.mark.django_db
def test_approver_cannot_submit(api, draft_memo, maker, approver):
    # Phase 2: submit is author-gated (any role may create/submit their OWN
    # memo). An approver still cannot submit a memo they did not author — the
    # maker's draft is outside the approver's queryset, so it is denied (404).
    api.force_authenticate(approver)
    resp = api.post(f"/api/v1/memos/{draft_memo.id}/submit/")
    assert resp.status_code in (403, 404)


@pytest.mark.django_db
def test_unauthenticated_denied(api, draft_memo):
    resp = api.get(f"/api/v1/memos/{draft_memo.id}/")
    assert resp.status_code == 401
