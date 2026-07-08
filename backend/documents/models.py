import uuid

from django.conf import settings
from django.db import models


class IssuedDocument(models.Model):
    """
    Registry of every PDF the system issues, enabling public verification via
    the document number embedded in the PDF's QR code. Holds only
    non-sensitive metadata (who/when/validity), never the document body.
    """
    class DocType(models.TextChoices):
        MEMO = "memo", "Memo"
        LEAVE_APPLICATION = "leave_application", "Leave Application"
        LEAVE_CERTIFICATE = "leave_certificate", "Leave Certificate"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_number = models.CharField(max_length=64, unique=True, db_index=True)
    doc_type = models.CharField(max_length=30, choices=DocType.choices)

    target_type = models.CharField(max_length=30)  # "memo" | "leave"
    target_id = models.UUIDField()

    subject = models.CharField(max_length=255, blank=True, default="")
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="documents_issued",
    )
    actors = models.JSONField(default=list, blank=True)  # names shown on verify page
    is_valid = models.BooleanField(default=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self):
        return f"{self.document_number} ({self.doc_type})"
