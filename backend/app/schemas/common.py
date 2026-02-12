"""Shared schemas used across multiple endpoints."""

from pydantic import BaseModel


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20


class APIResponse(BaseModel):
    success: bool = True
    data: dict | list | None = None
    message: str | None = None
