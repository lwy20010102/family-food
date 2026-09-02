from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


KNOWN_FRONTEND_ORIGINS = (
    "https://family-food-ca2u2sq12-lwy20010102.vercel.app",
    "https://family-food-git-main-lwy20010102.vercel.app",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "FamilyFood API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"
    # Render exposes RENDER=true automatically. Treat it as production even
    # when ENVIRONMENT was not added manually in the service settings.
    render: bool = False
    database_url: str = "sqlite:///./family_food.db"
    fallback_database_url: str = "sqlite:///./family_food.db"
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    backend_cors_origins: str = Field(
        default=(
            "http://localhost:3000,http://127.0.0.1:3000,"
            "https://family-food-ca2u2sq12-lwy20010102.vercel.app"
        )
    )
    frontend_public_url: str = "https://family-food-git-main-lwy20010102.vercel.app"
    auth_cookie_name: str = "family_food_access_token"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: str = "lax"
    auth_cookie_path: str = "/"
    ai_api_key: str = ""
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = ""
    ai_timeout_seconds: int = Field(default=30, ge=1, le=120)
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "recipe-images"
    backend_public_url: str = ""
    recipe_image_max_mb: int = Field(default=10, ge=1, le=25)

    @property
    def cors_origin_list(self) -> list[str]:
        configured_origins = [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]
        configured_origins.extend(KNOWN_FRONTEND_ORIGINS)
        if self.frontend_public_url.strip():
            configured_origins.append(self.frontend_public_url.strip().rstrip("/"))
        return list(dict.fromkeys(configured_origins))


@lru_cache
def get_settings() -> Settings:
    return Settings()
