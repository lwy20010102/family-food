from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.daily_menus import router as daily_menus_router
from app.api.dietary_preferences import router as dietary_preferences_router
from app.api.dish_orders import router as dish_orders_router
from app.api.family_stats import router as family_stats_router
from app.api.families import router as families_router
from app.api.health import router as health_router
from app.api.notifications import router as notifications_router
from app.api.recipes import router as recipes_router
from app.api.shopping_lists import router as shopping_lists_router
from app.api.weekly_menus import router as weekly_menus_router
from app.core.config import get_settings
from app.database.init_db import init_db
from app.services.recipe_image_service import LOCAL_RECIPE_IMAGE_DIR


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.mount(
        "/media",
        StaticFiles(
            directory=str(LOCAL_RECIPE_IMAGE_DIR.parent),
            check_dir=False,
        ),
        name="media",
    )

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(auth_router, prefix=settings.api_v1_prefix)
    app.include_router(families_router, prefix=settings.api_v1_prefix)
    app.include_router(recipes_router, prefix=settings.api_v1_prefix)
    app.include_router(daily_menus_router, prefix=settings.api_v1_prefix)
    app.include_router(dietary_preferences_router, prefix=settings.api_v1_prefix)
    app.include_router(dish_orders_router, prefix=settings.api_v1_prefix)
    app.include_router(family_stats_router, prefix=settings.api_v1_prefix)
    app.include_router(notifications_router, prefix=settings.api_v1_prefix)
    app.include_router(shopping_lists_router, prefix=settings.api_v1_prefix)
    app.include_router(weekly_menus_router, prefix=settings.api_v1_prefix)

    @app.get("/")
    def root() -> dict[str, str]:
        return {
            "name": settings.app_name,
            "status": "running",
        }

    return app


app = create_app()
