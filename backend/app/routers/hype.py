"""Hype Analyzer endpoint — returns mock hype scores and trend data."""

from fastapi import APIRouter

router = APIRouter()

MOCK_HYPE_DATA = {
    "1": {
        "item_name": "Pokemon Prismatic Evolutions",
        "hype_score": 92,
        "trend": "rising",
        "signals": {
            "google_trends": 88,
            "reddit_mentions": 1245,
            "twitter_mentions": 3420,
            "youtube_videos": 156,
            "youtube_views": 2800000,
            "tiktok_views": 12500000,
        },
        "history": [
            {"date": "2026-02-05", "score": 72},
            {"date": "2026-02-06", "score": 75},
            {"date": "2026-02-07", "score": 80},
            {"date": "2026-02-08", "score": 84},
            {"date": "2026-02-09", "score": 87},
            {"date": "2026-02-10", "score": 90},
            {"date": "2026-02-11", "score": 92},
        ],
    },
    "2": {
        "item_name": "Nike Air Max Dn",
        "hype_score": 78,
        "trend": "peaking",
        "signals": {
            "google_trends": 75,
            "reddit_mentions": 432,
            "twitter_mentions": 1890,
            "youtube_videos": 89,
            "youtube_views": 1200000,
            "tiktok_views": 8900000,
        },
        "history": [
            {"date": "2026-02-05", "score": 65},
            {"date": "2026-02-06", "score": 70},
            {"date": "2026-02-07", "score": 74},
            {"date": "2026-02-08", "score": 77},
            {"date": "2026-02-09", "score": 78},
            {"date": "2026-02-10", "score": 78},
            {"date": "2026-02-11", "score": 78},
        ],
    },
    "3": {
        "item_name": "Yu-Gi-Oh! 25th Anniversary Rarity Collection II",
        "hype_score": 65,
        "trend": "stable",
        "signals": {
            "google_trends": 55,
            "reddit_mentions": 289,
            "twitter_mentions": 876,
            "youtube_videos": 45,
            "youtube_views": 650000,
            "tiktok_views": 3200000,
        },
        "history": [
            {"date": "2026-02-05", "score": 63},
            {"date": "2026-02-06", "score": 64},
            {"date": "2026-02-07", "score": 65},
            {"date": "2026-02-08", "score": 64},
            {"date": "2026-02-09", "score": 65},
            {"date": "2026-02-10", "score": 66},
            {"date": "2026-02-11", "score": 65},
        ],
    },
    "4": {
        "item_name": "Beanie Babies Revival Collection",
        "hype_score": 12,
        "trend": "dead",
        "signals": {
            "google_trends": 8,
            "reddit_mentions": 15,
            "twitter_mentions": 42,
            "youtube_videos": 3,
            "youtube_views": 12000,
            "tiktok_views": 45000,
        },
        "history": [
            {"date": "2026-02-05", "score": 18},
            {"date": "2026-02-06", "score": 16},
            {"date": "2026-02-07", "score": 15},
            {"date": "2026-02-08", "score": 14},
            {"date": "2026-02-09", "score": 13},
            {"date": "2026-02-10", "score": 12},
            {"date": "2026-02-11", "score": 12},
        ],
    },
}

LEADERBOARDS = {
    "trading_cards": [
        {"name": "Pokemon Prismatic Evolutions", "score": 92, "trend": "rising"},
        {"name": "MTG Foundations Collector Box", "score": 71, "trend": "stable"},
        {"name": "Yu-Gi-Oh! 25th Anniversary RC2", "score": 65, "trend": "stable"},
        {"name": "Pokemon 151 UPC", "score": 58, "trend": "falling"},
        {"name": "One Piece OP-09", "score": 52, "trend": "rising"},
    ],
    "sneakers": [
        {"name": "Nike Air Max Dn", "score": 78, "trend": "peaking"},
        {"name": "Air Jordan 4 Oxidized Green", "score": 72, "trend": "rising"},
        {"name": "New Balance 990v6", "score": 61, "trend": "stable"},
        {"name": "Adidas Samba OG", "score": 45, "trend": "falling"},
        {"name": "Nike Dunk Low Panda", "score": 38, "trend": "falling"},
    ],
    "electronics": [
        {"name": "Nintendo Switch 2", "score": 95, "trend": "rising"},
        {"name": "PS5 Pro", "score": 68, "trend": "stable"},
        {"name": "Steam Deck OLED", "score": 55, "trend": "falling"},
        {"name": "Apple Vision Pro 2", "score": 48, "trend": "rising"},
        {"name": "Meta Quest 4", "score": 42, "trend": "stable"},
    ],
}


@router.get("/leaderboards")
async def get_leaderboards():
    return {"leaderboards": LEADERBOARDS}


@router.get("/{item_id}")
async def get_hype_score(item_id: str):
    data = MOCK_HYPE_DATA.get(item_id)
    if data:
        return data
    return {
        "item_name": f"Item #{item_id}",
        "hype_score": 50,
        "trend": "stable",
        "signals": {
            "google_trends": 45,
            "reddit_mentions": 120,
            "twitter_mentions": 340,
            "youtube_videos": 22,
            "youtube_views": 180000,
            "tiktok_views": 900000,
        },
        "history": [],
    }
