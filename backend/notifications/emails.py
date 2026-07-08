"""Email rendering + delivery for notifications (HTML + plain-text fallback)."""
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .models import Category


def _template_for(category):
    if str(category).startswith("MEMO"):
        return "emails/memo_action.html"
    if category in (Category.LEAVE_SUBMITTED, Category.LEAVE_APPROVED, Category.LEAVE_REJECTED):
        return "emails/leave_action.html"
    if category == Category.LEAVE_BALANCE_LOW:
        return "emails/balance_alert.html"
    return "emails/generic.html"


def _frontend(path=""):
    base = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    if path and path.startswith("/"):
        return f"{base}{path}"
    return path or base


def _context(recipient_name, category, title, body, action_url):
    return {
        "recipient_name": recipient_name,
        "title": title,
        "body": body,
        "action_url": _frontend(action_url),
        "unsubscribe_url": _frontend("/notifications"),
        "category_label": dict(Category.choices).get(category, str(category)),
    }


def send_notification_email(user_email, recipient_name, category, title, body, action_url):
    """Render + send. Template rendering and sending touch no database, so this
    is safe to run in a background thread (the is_email_sent flag is set by the
    caller in the main thread)."""
    ctx = _context(recipient_name, category, title, body, action_url)
    html = render_to_string(_template_for(category), ctx)
    text = render_to_string("emails/notification.txt", ctx)
    msg = EmailMultiAlternatives(
        f"[NIF Portal] {title}", text, settings.DEFAULT_FROM_EMAIL, [user_email],
    )
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=True)


def dispatch_email(user, category, title, body, action_url):
    args = (user.email, (user.get_full_name() or user.username), category, title, body, action_url)
    if getattr(settings, "NOTIFICATIONS_RUN_SYNC", False):
        send_notification_email(*args)
        return

    def _work():
        try:
            send_notification_email(*args)
        except Exception:  # noqa: BLE001 - email failures must not break the app
            pass

    threading.Thread(target=_work, daemon=True).start()
