from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


def _create_engine(database_url: str):
    engine_kwargs: dict[str, object] = {"pool_pre_ping": True}

    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    return create_engine(database_url, **engine_kwargs)


@lru_cache
def get_engine():
    settings = get_settings()
    database_url = settings.database_url.strip()
    environment = settings.environment.strip().lower()
    is_production = environment in {"production", "prod"} or settings.render

    if not database_url:
        raise RuntimeError("DATABASE_URL 未配置，无法连接数据库")

    if is_production and database_url.startswith("sqlite"):
        raise RuntimeError(
            "生产环境禁止使用 SQLite。请在 Render 中配置指向 Supabase 的 DATABASE_URL"
        )

    try:
        engine = _create_engine(database_url)
        if not database_url.startswith("sqlite"):
            with engine.connect() as connection:
                connection.exec_driver_sql("SELECT 1")
        return engine
    except Exception as exc:
        # An explicitly configured remote database must never be hidden by a
        # local fallback, even when ENVIRONMENT was omitted on the host.
        if is_production or not database_url.startswith("sqlite"):
            raise RuntimeError(
                "无法连接 DATABASE_URL。请检查 Render 中的 Supabase 连接字符串"
            ) from exc

        fallback_database_url = settings.fallback_database_url.strip()
        if not fallback_database_url:
            raise RuntimeError("主数据库连接失败，且未配置 FALLBACK_DATABASE_URL") from exc

        return _create_engine(fallback_database_url)


@lru_cache
def get_session_factory():
    return sessionmaker(
        bind=get_engine(),
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


def get_db() -> Generator[Session, None, None]:
    SessionLocal = get_session_factory()
    with SessionLocal() as session:
        yield session
