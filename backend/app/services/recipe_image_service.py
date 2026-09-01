from __future__ import annotations

import secrets
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import UploadFile

from app.core.config import Settings


LOCAL_RECIPE_IMAGE_DIR = (
    Path(__file__).resolve().parents[2] / "uploads" / "recipe-images"
)
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
IMAGE_SIGNATURES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),
    "image/gif": (b"GIF87a", b"GIF89a"),
}


def store_recipe_image(
    file: UploadFile,
    settings: Settings,
    user_id: int,
    public_base_url: str,
) -> str:
    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    extension = ALLOWED_IMAGE_TYPES.get(content_type)
    if extension is None:
        raise ValueError("只支持 JPG、PNG、WEBP 或 GIF 图片")

    max_bytes = settings.recipe_image_max_mb * 1024 * 1024
    image_bytes = file.file.read(max_bytes + 1)
    if len(image_bytes) > max_bytes:
        raise ValueError(
            f"图片不能超过 {settings.recipe_image_max_mb} MB"
        )
    if not image_bytes:
        raise ValueError("图片文件为空")
    if not _matches_signature(content_type, image_bytes):
        raise ValueError("图片文件内容与扩展格式不一致")

    object_path = f"user-{user_id}/{secrets.token_hex(16)}{extension}"
    if settings.supabase_url and settings.supabase_service_role_key:
        _upload_to_supabase(
            image_bytes=image_bytes,
            content_type=content_type,
            object_path=object_path,
            settings=settings,
        )
        bucket = quote(settings.supabase_storage_bucket.strip(), safe="")
        encoded_path = quote(object_path, safe="/")
        return (
            f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/"
            f"{bucket}/{encoded_path}"
        )

    LOCAL_RECIPE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    local_path = LOCAL_RECIPE_IMAGE_DIR / object_path
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(image_bytes)
    return f"{public_base_url.rstrip('/')}/media/recipe-images/{object_path}"


def _matches_signature(content_type: str, image_bytes: bytes) -> bool:
    signatures = IMAGE_SIGNATURES[content_type]
    if content_type == "image/webp":
        return len(image_bytes) >= 12 and image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP"
    return any(image_bytes.startswith(signature) for signature in signatures)


def _upload_to_supabase(
    image_bytes: bytes,
    content_type: str,
    object_path: str,
    settings: Settings,
) -> None:
    bucket = quote(settings.supabase_storage_bucket.strip(), safe="")
    encoded_path = quote(object_path, safe="/")
    endpoint = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{bucket}/{encoded_path}"
    )
    request = Request(
        endpoint,
        data=image_bytes,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": content_type,
            "x-upsert": "false",
        },
    )
    try:
        with urlopen(request, timeout=settings.ai_timeout_seconds):
            return
    except (HTTPError, URLError, TimeoutError) as exc:
        raise ValueError("图片上传到云端失败，请检查 Supabase Storage 配置") from exc
