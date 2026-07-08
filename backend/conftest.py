import pytest


@pytest.fixture(autouse=True)
def _notifications_sync(settings):
    """
    Send notification emails synchronously in tests so background threads never
    race the shared mail.outbox (or the sqlite connection). Production keeps the
    async thread behaviour (NOTIFICATIONS_RUN_SYNC defaults False).
    """
    settings.NOTIFICATIONS_RUN_SYNC = True
