"""PDF rendering + QR helpers shared by the memo/leave document endpoints."""
import base64
import io

from django.conf import settings
from django.template.loader import render_to_string


def qr_data_uri(url):
    """Return a base64 PNG data-URI QR code for `url` (embeddable in HTML)."""
    import qrcode

    img = qrcode.make(url, box_size=6, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def verify_url(document_number):
    base = getattr(settings, "SITE_URL", "http://localhost:8001").rstrip("/")
    return f"{base}/api/v1/verify/{document_number}/"


def common_context(document_number):
    """Letterhead + QR verification context shared by every PDF template."""
    from django.utils import timezone

    now = timezone.now()
    url = verify_url(document_number)
    return {
        "org": getattr(settings, "ORG_INFO", {}),
        "document_number": document_number,
        "verify_url": url,
        "verify_qr": qr_data_uri(url),
        "generated_at": now.strftime("%Y-%m-%d %H:%M"),
        "issue_date": now.strftime("%Y-%m-%d"),
    }


def render_pdf(template_name, context):
    """Render a template to PDF bytes via weasyprint."""
    import weasyprint

    html = render_to_string(template_name, context)
    # base_url lets weasyprint resolve any relative static asset references.
    return weasyprint.HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf()
