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
    database_url = settings.database_url

    try:
        engine = _create_engine(database_url)
        if not database_url.startswith("sqlite"):
            with engine.connect() as connection:
                connection.exec_driver_sql("SELECT 1")
        return engine
    except Exception:
        return _create_engine(settings.fallback_database_url)


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
