import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


def report_upload_path(instance, filename):
    now = timezone.now()
    return f"reports/{now.year}/{now.month:02d}/{filename}"


class ReportType(models.TextChoices):
    EMPLOYEE_REGISTER = "employee_register", "Employee Leave Register"
    MONTHLY_ATTENDANCE = "monthly_attendance", "Monthly Attendance Report"
    LEAVE_UTILIZATION = "leave_utilization", "Leave Utilization Report"
    COMPLIANCE = "compliance", "Compliance Report"
    AUDIT_TRAIL = "audit_trail", "Audit Trail Report"


# Which output formats each report supports (first is the default).
REPORT_FORMATS = {
    ReportType.EMPLOYEE_REGISTER: ["excel"],
    ReportType.MONTHLY_ATTENDANCE: ["excel", "pdf"],
    ReportType.LEAVE_UTILIZATION: ["pdf"],
    ReportType.COMPLIANCE: ["pdf"],
    ReportType.AUDIT_TRAIL: ["excel"],
}


class ReportRun(models.Model):
    """A single report generation request and its resulting file."""
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        GENERATING = "generating", "Generating"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_type = models.CharField(max_length=40, choices=ReportType.choices)
    params = models.JSONField(default=dict, blank=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="report_runs",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    file = models.FileField(upload_to=report_upload_path, null=True, blank=True)
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def file_url(self):
        return self.file.url if self.file else None

    def __str__(self):
        return f"{self.get_report_type_display()} ({self.status})"


class ScheduledReport(models.Model):
    """A recurring report definition delivered by email."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_type = models.CharField(max_length=40, choices=ReportType.choices)
    params = models.JSONField(default=dict, blank=True)
    recipients = models.JSONField(default=list, blank=True)  # list of email addresses
    # Supports @hourly / @daily / @weekly / @monthly shortcuts (see command).
    cron_expression = models.CharField(max_length=64, default="@daily")
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="scheduled_reports",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["report_type"]

    def __str__(self):
        return f"{self.get_report_type_display()} -> {', '.join(self.recipients)} ({self.cron_expression})"
