from datetime import date, timedelta

import pytest
from django.core import mail
from rest_framework.test import APIClient

from leaves.models import Leave
from memos.models import Memo
from memos import services as memo_services
from notifications.models import Category, Notification, NotificationPreference
from users.models import User

MONDAY = date.fromisocalendar(2026, 24, 1)


@pytest.fixture
def sync_email(settings):
    settings.NOTIFICATIONS_RUN_SYNC = True
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    return settings


@pytest.fixture
def maker(db):
    return User.objects.create_user(username="nmaker", email="nmaker@nif.test", password="pass12345", first_name="Mo", role=User.Roles.MAKER, department="ENG")


@pytest.fixture
def checker(db):
    return User.objects.create_user(username="nchecker", email="nchecker@nif.test", password="pass12345", first_name="Cho", role=User.Roles.CHECKER, department="ENG")


@pytest.fixture
def approver(db):
    return User.objects.create_user(username="napprover", email="napprover@nif.test", password="pass12345", role=User.Roles.APPROVER, department="ENG")


def _draft_memo(maker):
    from memos.services import generate_memo_number
    return Memo.objects.create(
        title="Budget", subject="s", body="b", memo_type=Memo.MemoType.HR,
        status=Memo.Status.DRAFT, created_by=maker, memo_number=generate_memo_number(Memo.MemoType.HR),
    )


# --- Deliverable 5: memo action -> in-app + email --------------------------
@pytest.mark.django_db
def test_memo_submit_notifies_reviewer_in_app_and_email(sync_email, maker, checker, approver):
    memo = _draft_memo(maker)
    memo_services.submit_memo(memo, maker)

    notif = Notification.objects.filter(recipient=checker, category=Category.MEMO_ASSIGNED_TO_REVIEW).first()
    assert notif is not None
    assert memo.memo_number in notif.title
    assert notif.action_url == f"/memos/{memo.id}"

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [checker.email]
    assert mail.outbox[0].alternatives  # has HTML alternative


@pytest.mark.django_db
def test_memo_approve_notifies_author(sync_email, maker, checker, approver):
    memo = _draft_memo(maker)
    memo = memo_services.submit_memo(memo, maker)
    memo = memo_services.review_memo(memo, checker, comment="ok")
    mail.outbox.clear()
    memo_services.approve_memo(memo, approver, comment="done")
    assert Notification.objects.filter(recipient=maker, category=Category.MEMO_APPROVED).exists()
    assert any(m.to == [maker.email] for m in mail.outbox)


# --- preferences respected -------------------------------------------------
@pytest.mark.django_db
def test_email_preference_disabled_skips_email(sync_email, maker, checker, approver):
    NotificationPreference.objects.create(
        user=checker, category=Category.MEMO_ASSIGNED_TO_REVIEW, in_app_enabled=True, email_enabled=False,
    )
    memo = _draft_memo(maker)
    memo_services.submit_memo(memo, maker)
    # in-app still created, but no email
    assert Notification.objects.filter(recipient=checker).exists()
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_inapp_preference_disabled_skips_record(sync_email, maker, checker, approver):
    NotificationPreference.objects.create(
        user=checker, category=Category.MEMO_ASSIGNED_TO_REVIEW, in_app_enabled=False, email_enabled=True,
    )
    memo = _draft_memo(maker)
    memo_services.submit_memo(memo, maker)
    assert not Notification.objects.filter(recipient=checker).exists()
    assert len(mail.outbox) == 1  # email still sent


# --- leave notifications ---------------------------------------------------
@pytest.mark.django_db
def test_leave_approval_notifies_user(sync_email, maker, approver):
    leave = Leave.objects.create(user=maker, leave_type="annual", reason="x", start_date=MONDAY, end_date=MONDAY, approver=approver)
    assert Notification.objects.filter(recipient=approver, category=Category.LEAVE_SUBMITTED).exists()

    leave.status = Leave.Status.APPROVED
    leave.save()
    assert Notification.objects.filter(recipient=maker, category=Category.LEAVE_APPROVED).exists()


@pytest.mark.django_db
def test_low_balance_notification_is_idempotent(sync_email, maker, approver):
    # ANNUAL entitled 18; take 16 days approved -> available 2 (< 3) -> alert.
    leave = Leave.objects.create(user=maker, leave_type="annual", reason="x", start_date=MONDAY, end_date=MONDAY + timedelta(days=21), approver=approver)
    leave.status = Leave.Status.APPROVED
    leave.save()
    count1 = Notification.objects.filter(recipient=maker, category=Category.LEAVE_BALANCE_LOW).count()
    assert count1 == 1
    # Re-trigger by re-saving; idempotency key prevents a duplicate.
    leave.save()
    assert Notification.objects.filter(recipient=maker, category=Category.LEAVE_BALANCE_LOW).count() == 1


# --- API -------------------------------------------------------------------
@pytest.mark.django_db
def test_notification_api_list_unread_mark(sync_email, maker, checker, approver):
    memo = _draft_memo(maker)
    memo_services.submit_memo(memo, maker)

    client = APIClient()
    client.force_authenticate(checker)
    assert client.get("/api/v1/notifications/unread-count/").data["unread"] == 1

    listed = client.get("/api/v1/notifications/")
    nid = listed.data["results"][0]["id"]
    assert client.post(f"/api/v1/notifications/{nid}/read/").data["is_read"] is True
    assert client.get("/api/v1/notifications/unread-count/").data["unread"] == 0

    # cannot see other users' notifications
    client.force_authenticate(approver)
    assert client.get("/api/v1/notifications/").data["count"] == 0


@pytest.mark.django_db
def test_preferences_get_and_update(maker):
    client = APIClient()
    client.force_authenticate(maker)
    prefs = client.get("/api/v1/notifications/preferences/")
    assert prefs.status_code == 200
    assert any(p["category"] == "WEEKLY_DIGEST" for p in prefs.data)

    resp = client.post("/api/v1/notifications/preferences/", {"category": "MEMO_APPROVED", "in_app_enabled": True, "email_enabled": False}, format="json")
    assert resp.status_code == 200
    assert NotificationPreference.objects.filter(user=maker, category="MEMO_APPROVED", email_enabled=False).exists()


@pytest.mark.django_db
def test_weekly_digest_only_for_opted_in(sync_email, maker):
    from django.core.management import call_command
    # No opt-in yet -> no mail.
    call_command("send_weekly_digest")
    assert len(mail.outbox) == 0

    NotificationPreference.objects.create(user=maker, category=Category.WEEKLY_DIGEST, email_enabled=True)
    call_command("send_weekly_digest")
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [maker.email]
