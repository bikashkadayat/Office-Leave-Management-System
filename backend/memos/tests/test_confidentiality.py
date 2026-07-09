"""M1: memo read access is scoped by department and memo-type sensitivity."""
import pytest

from memos.models import Memo
from memos.services import generate_memo_number
from users.models import User


def _user(username, role, department):
    return User.objects.create_user(
        username=username, email=f"{username}@nif.test", password="pass12345",
        first_name=username.capitalize(), last_name="T", role=role, department=department,
    )


def _memo(author, memo_type, status, reviewer=None):
    return Memo.objects.create(
        title="T", subject="S", body="<p>b</p>", memo_type=memo_type, status=status,
        created_by=author, current_reviewer=reviewer,
        memo_number=generate_memo_number(memo_type),
    )


@pytest.mark.django_db
def test_checker_cannot_see_unassigned_other_dept_memo(api, db):
    eng_maker = _user("engmaker", User.Roles.MAKER, "Engineering")
    eng_checker = _user("engchecker", User.Roles.CHECKER, "Engineering")
    hr_checker = _user("hrchecker", User.Roles.CHECKER, "HRdept")
    memo = _memo(eng_maker, Memo.MemoType.GENERAL, Memo.Status.SUBMITTED, reviewer=eng_checker)

    # Same-department checker (not assigned) sees the general memo via the pool.
    api.force_authenticate(eng_checker)  # also the assignee here
    assert api.get(f"/api/v1/memos/{memo.id}/").status_code == 200

    # A checker in a different department cannot see it at all.
    api.force_authenticate(hr_checker)
    assert api.get(f"/api/v1/memos/{memo.id}/").status_code == 404


@pytest.mark.django_db
def test_same_dept_checker_sees_nonsensitive_pool(api, db):
    maker = _user("m_eng", User.Roles.MAKER, "Engineering")
    assigned = _user("c_eng_a", User.Roles.CHECKER, "Engineering")
    other = _user("c_eng_b", User.Roles.CHECKER, "Engineering")
    memo = _memo(maker, Memo.MemoType.GENERAL, Memo.Status.SUBMITTED, reviewer=assigned)
    api.force_authenticate(other)  # same dept, not assigned
    assert api.get(f"/api/v1/memos/{memo.id}/").status_code == 200


@pytest.mark.django_db
def test_financial_memo_restricted_to_assigned(api, db):
    maker = _user("m_fin", User.Roles.MAKER, "Engineering")
    assigned = _user("c_fin_a", User.Roles.CHECKER, "Engineering")
    other = _user("c_fin_b", User.Roles.CHECKER, "Engineering")  # same dept!
    memo = _memo(maker, Memo.MemoType.FINANCIAL, Memo.Status.SUBMITTED, reviewer=assigned)

    # Same department but NOT assigned -> a sensitive memo is invisible.
    api.force_authenticate(other)
    assert api.get(f"/api/v1/memos/{memo.id}/").status_code == 404

    # The assigned checker still sees it.
    api.force_authenticate(assigned)
    assert api.get(f"/api/v1/memos/{memo.id}/").status_code == 200


@pytest.mark.django_db
def test_hr_memo_not_in_list_for_unassigned_same_dept(api, db):
    maker = _user("m_hr", User.Roles.MAKER, "Engineering")
    assigned = _user("c_hr_a", User.Roles.CHECKER, "Engineering")
    other = _user("c_hr_b", User.Roles.CHECKER, "Engineering")
    memo = _memo(maker, Memo.MemoType.HR, Memo.Status.SUBMITTED, reviewer=assigned)
    api.force_authenticate(other)
    ids = {m["id"] for m in api.get("/api/v1/memos/").data["results"]}
    assert str(memo.id) not in ids


@pytest.mark.django_db
def test_admin_still_sees_sensitive_cross_dept(api, db, admin):
    maker = _user("m_x", User.Roles.MAKER, "Engineering")
    memo = _memo(maker, Memo.MemoType.FINANCIAL, Memo.Status.SUBMITTED)
    api.force_authenticate(admin)
    assert api.get(f"/api/v1/memos/{memo.id}/").status_code == 200
