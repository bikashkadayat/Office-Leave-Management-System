import pytest
from rest_framework.test import APIClient

from users.models import User
from memos.models import Memo


@pytest.fixture
def api():
    return APIClient()


def _make_user(username, role, department="Finance"):
    return User.objects.create_user(
        username=username,
        email=f"{username}@nif.test",
        password="pass12345",
        first_name=username.capitalize(),
        last_name="Test",
        role=role,
        department=department,
    )


@pytest.fixture
def maker(db):
    return _make_user("maker1", User.Roles.MAKER)


@pytest.fixture
def other_maker(db):
    return _make_user("maker2", User.Roles.MAKER)


@pytest.fixture
def checker(db):
    return _make_user("checker1", User.Roles.CHECKER)


@pytest.fixture
def other_checker(db):
    return _make_user("checker2", User.Roles.CHECKER)


@pytest.fixture
def approver(db):
    return _make_user("approver1", User.Roles.APPROVER)


@pytest.fixture
def admin(db):
    return _make_user("admin1", User.Roles.ADMIN)


@pytest.fixture
def draft_memo(db, maker):
    """A bare draft memo authored by `maker`."""
    from memos.services import generate_memo_number
    return Memo.objects.create(
        title="Quarterly budget request",
        subject="Budget",
        body="Please approve the attached budget.",
        memo_type=Memo.MemoType.HR,
        priority=Memo.Priority.NORMAL,
        status=Memo.Status.DRAFT,
        created_by=maker,
        memo_number=generate_memo_number(Memo.MemoType.HR),
    )
