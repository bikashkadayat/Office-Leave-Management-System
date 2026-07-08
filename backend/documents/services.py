from django.db import transaction
from django.utils import timezone

from .models import IssuedDocument

_PREFIX = {
    IssuedDocument.DocType.LEAVE_APPLICATION: "LV",
    IssuedDocument.DocType.LEAVE_CERTIFICATE: "CERT",
}


@transaction.atomic
def _next_number(doc_type):
    year = timezone.now().year
    prefix = f"NIFN-{_PREFIX[doc_type]}-{year}-"
    last = (
        IssuedDocument.objects.select_for_update()
        .filter(document_number__startswith=prefix)
        .order_by("-document_number").first()
    )
    seq = int(last.document_number.rsplit("-", 1)[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


def issue_document(doc_type, target_type, target, subject, issued_by, actors):
    """
    Register (idempotently) an issued PDF and return its IssuedDocument. Memos
    reuse their memo_number; leave docs get a fresh sequential number.
    """
    existing = IssuedDocument.objects.filter(
        target_type=target_type, target_id=target.id, doc_type=doc_type,
    ).first()
    if existing:
        return existing

    if doc_type == IssuedDocument.DocType.MEMO:
        number = target.memo_number
    else:
        number = _next_number(doc_type)

    return IssuedDocument.objects.create(
        document_number=number, doc_type=doc_type,
        target_type=target_type, target_id=target.id,
        subject=subject or "", issued_by=issued_by if getattr(issued_by, "is_authenticated", False) else None,
        actors=actors or [],
    )
