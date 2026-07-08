from django.conf import settings
from django.core.mail import EmailMessage


def send_report_email(scheduled, content, filename, content_type):
    """Email a generated report as an attachment to the scheduled recipients."""
    recipients = scheduled.recipients or []
    if not recipients:
        return 0
    subject = f"[NIF Portal] {scheduled.get_report_type_display()}"
    body = (
        f"Attached is your scheduled report: {scheduled.get_report_type_display()}.\n"
        f"Generated automatically by the NIF Leave & Memo Portal."
    )
    message = EmailMessage(subject, body, settings.DEFAULT_FROM_EMAIL, recipients)
    message.attach(filename, content, content_type)
    return message.send(fail_silently=False)
