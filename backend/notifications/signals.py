"""
Leave notification triggers. Memo notifications are emitted directly from
memos.services (which owns the memo state transitions).

This receiver runs after leaves' own post_save receiver (leaves is loaded before
notifications in INSTALLED_APPS), so balances are already recomputed when the
low-balance check runs.
"""
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from leaves.models import EnterpriseLeaveBalance, Leave, LeaveType
from .dispatcher import notify
from .models import Category

User = get_user_model()
LOW_BALANCE_THRESHOLD = 3


def _employee(user):
    return user.get_full_name() or user.username


def _check_low_balance(leave):
    leave_type = LeaveType.objects.filter(code__iexact=leave.leave_type).first()
    if leave_type is None:
        return
    year = leave.start_date.year
    balance = EnterpriseLeaveBalance.objects.filter(user=leave.user, leave_type=leave_type, year=year).first()
    if balance is None or balance.available_days >= LOW_BALANCE_THRESHOLD:
        return

    key = f"balance_low:{leave.user_id}:{leave_type.code}:{year}"
    notify(
        leave.user, Category.LEAVE_BALANCE_LOW,
        f"Low {leave_type.name} balance",
        f"You have {balance.available_days} day(s) of {leave_type.name} remaining for {year}.",
        action_url="/leaves/my-history", idempotency_key=key,
    )
    for hr in User.objects.filter(role="admin", is_active=True):
        notify(
            hr, Category.LEAVE_BALANCE_LOW,
            f"Low balance: {_employee(leave.user)}",
            f"{leave_type.name} balance is {balance.available_days} day(s) for {year}.",
            action_url=f"/admin/leaves/employees/{leave.user_id}",
            idempotency_key=f"{key}:hr:{hr.id}",
        )


@receiver(post_save, sender=Leave)
def leave_notifications(sender, instance, created, **kwargs):
    if getattr(instance, "is_deleted", False):
        return

    span = f"{instance.leave_type} · {instance.start_date} to {instance.end_date}"

    if created:
        if instance.approver:
            notify(
                instance.approver, Category.LEAVE_SUBMITTED,
                f"New leave request from {_employee(instance.user)}",
                span, action_url="/leave/pending",
            )
        _check_low_balance(instance)
        return

    old = getattr(instance, "_old_status", None)
    if old is not None and old != instance.status:
        if instance.status == Leave.Status.APPROVED:
            notify(instance.user, Category.LEAVE_APPROVED, "Your leave was approved", span, action_url="/leave/my-applications")
        elif instance.status == Leave.Status.REJECTED:
            notify(instance.user, Category.LEAVE_REJECTED, "Your leave was rejected", span, action_url="/leave/my-applications")
        _check_low_balance(instance)
