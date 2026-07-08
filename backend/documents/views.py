"""Public document verification (no authentication)."""
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string

from .models import IssuedDocument


def verify_document(request, document_number):
    doc = IssuedDocument.objects.filter(document_number=document_number).first()
    data = {
        "document_number": document_number,
        "valid": bool(doc and doc.is_valid),
        "doc_type": doc.get_doc_type_display() if doc else None,
        "subject": doc.subject if doc else None,
        "issued_at": doc.issued_at.isoformat() if doc else None,
        "actors": doc.actors if doc else [],
    }
    status = 200 if doc else 404
    wants_json = request.GET.get("format") == "json" or "application/json" in request.headers.get("Accept", "")
    if wants_json:
        return JsonResponse(data, status=status)
    html = render_to_string("verify/verify.html", {"d": data})
    return HttpResponse(html, status=status)
