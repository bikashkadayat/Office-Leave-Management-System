"""Health-check endpoints for Docker HEALTHCHECK and monitoring."""
import shutil

from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditLog
from users.admin_views import IsAdminOrSuperuser

CRON_EVENTS = [
    "SYSTEM_RECOMPUTE_BALANCES",
    "SYSTEM_RECOMPUTE_SUMMARIES",
    "SYSTEM_YEAR_END",
    "SYSTEM_INTEGRITY_AUDIT",
]


def _db_up():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True
    except Exception:
        return False


class HealthView(APIView):
    """GET /api/v1/health/ - public liveness probe with DB status."""
    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = _db_up()
        body = {"status": "ok" if db_ok else "degraded", "database": "up" if db_ok else "down"}
        code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(body, status=code)


class DetailedHealthView(APIView):
    """GET /api/v1/health/detailed/ - admin-only deep status."""
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        from leaves.models import LeaveDayRecord

        usage = shutil.disk_usage(str(settings.BASE_DIR))
        last_runs = {}
        for event in CRON_EVENTS:
            entry = AuditLog.objects.filter(changes__event=event).order_by("-created_at").first()
            last_runs[event] = entry.created_at if entry else None

        return Response({
            "status": "ok" if _db_up() else "degraded",
            "database": "up" if _db_up() else "down",
            "queues": {
                "pending_leave_days": LeaveDayRecord.objects.filter(
                    status=LeaveDayRecord.Status.PENDING
                ).count(),
            },
            "disk": {"total": usage.total, "used": usage.used, "free": usage.free},
            "last_cron_runs": last_runs,
        })
