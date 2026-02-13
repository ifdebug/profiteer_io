"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://profiteer:profiteer@db:5432/profiteer"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:8080,http://127.0.0.1:5500"

    # Scraper settings
    scraper_timeout: float = 15.0
    scraper_max_retries: int = 2
    scraper_cache_ttl: int = 1800  # 30 minutes default
    enabled_marketplaces: str = "ebay,tcgplayer,mercari"

    # API Keys (reserved for future use)
    ebay_app_id: str = ""
    ebay_cert_id: str = ""
    tcgplayer_public_key: str = ""
    tcgplayer_private_key: str = ""
    stockx_api_key: str = ""
    amazon_access_key: str = ""
    amazon_secret_key: str = ""
    amazon_partner_tag: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
