"""Scraper registry — provides access to all marketplace scrapers."""

from app.scrapers.base import BaseScraper
from app.scrapers.ebay import EbayScraper
from app.scrapers.mercari import MercariScraper
from app.scrapers.tcgplayer import TcgplayerScraper

# Singleton instances
_SCRAPERS: dict[str, BaseScraper] = {
    "ebay": EbayScraper(),
    "tcgplayer": TcgplayerScraper(),
    "mercari": MercariScraper(),
}


def get_scraper(marketplace: str) -> BaseScraper | None:
    """Get a single scraper by marketplace key."""
    return _SCRAPERS.get(marketplace)


def get_all_scrapers() -> list[BaseScraper]:
    """Get all registered scrapers."""
    return list(_SCRAPERS.values())


def get_scraper_names() -> list[str]:
    """Get all registered marketplace keys."""
    return list(_SCRAPERS.keys())
