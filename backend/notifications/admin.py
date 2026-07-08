from django.contrib import admin

from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("category", "recipient", "title", "is_read", "is_email_sent", "created_at")
    list_filter = ("category", "is_read", "is_email_sent")
    search_fields = ("title", "recipient__email")


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "category", "in_app_enabled", "email_enabled")
    list_filter = ("category", "in_app_enabled", "email_enabled")
