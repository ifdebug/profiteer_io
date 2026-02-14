"""Pydantic schemas for the Hype Analyzer endpoints."""

from pydantic import BaseModel


class HypeSignals(BaseModel):
    """Individual signal values displayed on the hype page."""

    google_trends: int = 0
    reddit_mentions: int = 0
    twitter_mentions: int = 0
    youtube_videos: int = 0
    youtube_views: int = 0
    tiktok_views: int = 0


class HypeHistoryPoint(BaseModel):
    """A single point in the hype score history chart."""

    date: str
    score: int


class HypeResponse(BaseModel):
    """Full hype analysis for a single item."""

    item_id: int
    item_name: str
    hype_score: int
    trend: str  # rising | peaking | stable | falling | dead
    signals: HypeSignals
    history: list[HypeHistoryPoint]

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    """A single entry in a category leaderboard."""

    item_id: int
    name: str
    score: int
    trend: str
    category: str | None = None


class LeaderboardResponse(BaseModel):
    """Leaderboards grouped by category."""

    leaderboards: dict[str, list[LeaderboardEntry]]


class HypeSearchResult(BaseModel):
    """Item search result for the hype search bar."""

    id: int
    name: str
    category: str | None = None
    latest_score: int | None = None

    model_config = {"from_attributes": True}
