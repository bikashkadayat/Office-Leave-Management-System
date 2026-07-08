"""Generate sample memo/leave PDFs into docs/samples/ (run via manage.py shell)."""
import os
from datetime import date, timedelta
from pathlib import Path

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
try:
    django.setup()
except Exception:
    pass

from django.conf import settings  # noqa: E402
from django.utils.html import linebreaks  # noqa: E402

from documents.models import IssuedDocument  # noqa: E402
from documents.pdf import common_context, render_pdf  # noqa: E402
from documents.services import issue_document  # noqa: E402
from leaves import services as leave_services  # noqa: E402
from leaves.models import Leave  # noqa: E402
from memos.models import Memo  # noqa: E402
from memos import services as memo_services  # noqa: E402
from users.models import User  # noqa: E402

OUT = Path(settings.BASE_DIR).parent / "docs" / "samples"
OUT.mkdir(parents=True, exist_ok=True)
MON = date.fromisocalendar(2026, 24, 1)


def _u(username, role):
    u, _ = User.objects.get_or_create(username=username, defaults={"email": f"{username}@nif.test", "role": role, "department": "ENG"})
    u.first_name, u.last_name, u.role, u.department = username.capitalize(), "Sample", role, "ENG"
    u.save()
    return u


maker, checker, approver = _u("smaker", "maker"), _u("schecker", "checker"), _u("sapprover", "approver")

# Approved memo
memo = Memo.objects.create(title="Quarterly Budget Approval", subject="Q3 Budget Allocation",
                           body="Please approve the attached Q3 budget.\nIt covers infrastructure and staffing.",
                           status=Memo.Status.DRAFT, created_by=maker,
                           memo_number=memo_services.generate_memo_number(Memo.MemoType.FINANCIAL),
                           memo_type=Memo.MemoType.FINANCIAL)
memo = memo_services.submit_memo(memo, maker)
memo = memo_services.review_memo(memo, memo.current_reviewer, comment="Reviewed")
memo = memo_services.approve_memo(memo, memo.current_approver, comment="Approved for release")

steps = list(memo.approval_steps.select_related("actor").all())
mdoc = issue_document(IssuedDocument.DocType.MEMO, "memo", memo, subject=memo.subject, issued_by=approver,
                      actors=[(s.actor.get_full_name() or s.actor.username) for s in steps if s.actor])
mctx = common_context(mdoc.document_number)
mctx.update({"memo": memo, "to_name": memo.current_approver.get_full_name(), "from_name": maker.get_full_name(),
             "cc_name": "", "body_html": linebreaks(memo.body), "approver_name": memo.current_approver.get_full_name(),
             "steps": [{"step_order": s.step_order, "get_action_display": s.get_action_display(),
                        "actor_name": (s.actor.get_full_name() or s.actor.username), "acted_at": s.acted_at, "comment": s.comment} for s in steps]})
(OUT / "memo.pdf").write_bytes(render_pdf("pdf/memo.html", mctx))

# Approved leave + certificate
leave = Leave.objects.create(user=maker, leave_type="annual", reason="Family vacation",
                             start_date=MON, end_date=MON + timedelta(days=3), approver=approver)
leave.status = Leave.Status.APPROVED
leave.save()


def _leave_ctx(doc):
    wd = leave_services.calculate_working_days(leave.start_date, leave.end_date)
    ctx = common_context(doc.document_number)
    ctx.update({"leave": leave, "employee_name": maker.get_full_name(), "department": "ENG",
                "approver_name": approver.get_full_name(), "working_days": wd,
                "balance_statement": f"This {wd}-day leave is reflected in the {leave.start_date.year} balance."})
    return ctx


ldoc = issue_document(IssuedDocument.DocType.LEAVE_APPLICATION, "leave", leave, subject="Annual leave", issued_by=approver, actors=[maker.get_full_name(), approver.get_full_name()])
(OUT / "leave_application.pdf").write_bytes(render_pdf("pdf/leave_application.html", _leave_ctx(ldoc)))

cdoc = issue_document(IssuedDocument.DocType.LEAVE_CERTIFICATE, "leave", leave, subject="Annual leave", issued_by=approver, actors=[approver.get_full_name()])
(OUT / "leave_certificate.pdf").write_bytes(render_pdf("pdf/leave_certificate.html", _leave_ctx(cdoc)))

for f in ("memo.pdf", "leave_application.pdf", "leave_certificate.pdf"):
    print("wrote", f, (OUT / f).stat().st_size, "bytes")
print("Samples in", OUT)
