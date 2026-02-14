"""APScheduler setup with Redis-backed job store.

Registers all periodic background tasks:
- Price updates: hourly — re-scrape items and update price_history
- Hype recalculation: every 6 hours — recompute hype scores for all items
- Arbitrage scan: every 30 minutes — find cross-marketplace price gaps
- Alert checks: every 15 minutes — evaluate price/hype alert thresholds
- Shipment updates: every 30 minutes — refresh tracking for active shipments

Usage:
    from app.tasks.scheduler import start_scheduler, shutdown_scheduler

    # In FastAPI lifespan:
    await start_scheduler()
    ...
    await shutdown_scheduler()
"""

import logging

from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.jobstores.redis import RedisJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings

logger = logging.getLogger(__name__)

# Parse Redis URL for job store config
_redis_url = settings.redis_url  # redis://redis:6379/0
_redis_host = "redis"
_redis_port = 6379
_redis_db = 1  # Use DB 1 for scheduler (DB 0 is cache)

try:
    from urllib.parse import urlparse

    _parsed = urlparse(_redis_url)
    _redis_host = _parsed.hostname or "redis"
    _redis_port = _parsed.port or 6379
except Exception:
    pass

# Scheduler singleton
scheduler: AsyncIOScheduler | None = None


def _create_scheduler() -> AsyncIOScheduler:
    """Create and configure the APScheduler instance."""
    jobstores = {
        "default": RedisJobStore(
            host=_redis_host,
            port=_redis_port,
            db=_redis_db,
        ),
    }

    executors = {
        "default": AsyncIOExecutor(),
    }

    job_defaults = {
        "coalesce": True,  # Merge missed runs into one
        "max_instances": 1,  # Only one instance of each job at a time
        "misfire_grace_time": 300,  # 5 min grace for missed jobs
    }

    return AsyncIOScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
    )


def _register_jobs(sched: AsyncIOScheduler) -> None:
    """Register all periodic background tasks."""
    from app.tasks.alert_checks import run_alert_checks
    from app.tasks.arbitrage_scan import run_arbitrage_scan
    from app.tasks.hype_recalc import run_hype_recalculation
    from app.tasks.price_updates import run_price_updates
    from app.tasks.shipment_updates import run_shipment_updates

    # Price updates — every hour
    sched.add_job(
        run_price_updates,
        trigger=IntervalTrigger(hours=1),
        id="price_updates",
        name="Price History Updates",
        replace_existing=True,
    )

    # Hype recalculation — every 6 hours
    sched.add_job(
        run_hype_recalculation,
        trigger=IntervalTrigger(hours=6),
        id="hype_recalc",
        name="Hype Score Recalculation",
        replace_existing=True,
    )

    # Arbitrage scan — every 30 minutes
    sched.add_job(
        run_arbitrage_scan,
        trigger=IntervalTrigger(minutes=30),
        id="arbitrage_scan",
        name="Arbitrage Opportunity Scan",
        replace_existing=True,
    )

    # Alert checks — every 15 minutes
    sched.add_job(
        run_alert_checks,
        trigger=IntervalTrigger(minutes=15),
        id="alert_checks",
        name="Price & Hype Alert Checks",
        replace_existing=True,
    )

    # Shipment tracking updates — every 30 minutes
    sched.add_job(
        run_shipment_updates,
        trigger=IntervalTrigger(minutes=30),
        id="shipment_updates",
        name="Shipment Tracking Updates",
        replace_existing=True,
    )

    logger.info(
        "Registered %d background jobs: %s",
        len(sched.get_jobs()),
        ", ".join(j.name for j in sched.get_jobs()),
    )


async def start_scheduler() -> None:
    """Start the background task scheduler."""
    global scheduler
    try:
        scheduler = _create_scheduler()
        _register_jobs(scheduler)
        scheduler.start()
        logger.info("Background scheduler started")
    except Exception as exc:
        logger.warning("Failed to start scheduler (non-fatal): %s", exc)
        scheduler = None


async def shutdown_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    global scheduler
    if scheduler is not None:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
        scheduler = None
