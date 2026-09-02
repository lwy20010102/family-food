from __future__ import annotations

import asyncio
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import HTTPException, Request, Response

from app.core.config import get_settings


UPSTREAM_REQUEST_HEADERS = {
    "accept",
    "user-agent",
    "rsc",
    "next-router-state-tree",
    "next-router-prefetch",
    "next-router-segment-prefetch",
    "next-url",
    "x-nextjs-data",
}

UPSTREAM_RESPONSE_HEADERS = {
    "cache-control",
    "content-disposition",
    "content-type",
    "etag",
    "last-modified",
    "vary",
}


def _build_upstream_url(path: str, query: str) -> str:
    base_url = get_settings().frontend_upstream_url.rstrip("/")
    encoded_path = quote(path, safe="/%:@-._~!$&'()*+,;=")
    url = f"{base_url}/{encoded_path}" if encoded_path else f"{base_url}/"
    return f"{url}?{query}" if query else url


def _fetch_upstream(
    method: str,
    url: str,
    headers: dict[str, str],
) -> tuple[int, dict[str, str], bytes]:
    request = UrlRequest(url, headers=headers, method=method)

    try:
        with urlopen(request, timeout=30) as upstream_response:
            response_headers = {
                key.lower(): value
                for key, value in upstream_response.headers.items()
                if key.lower() in UPSTREAM_RESPONSE_HEADERS
            }
            return (
                upstream_response.status,
                response_headers,
                b"" if method == "HEAD" else upstream_response.read(),
            )
    except HTTPError as error:
        response_headers = {
            key.lower(): value
            for key, value in error.headers.items()
            if key.lower() in UPSTREAM_RESPONSE_HEADERS
        }
        return error.code, response_headers, b"" if method == "HEAD" else error.read()
    except (TimeoutError, URLError, OSError) as error:
        raise HTTPException(
            status_code=502,
            detail="网页服务暂时无法连接，请稍后重试",
        ) from error


async def proxy_frontend_request(request: Request, path: str) -> Response:
    upstream_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() in UPSTREAM_REQUEST_HEADERS
    }
    url = _build_upstream_url(path, request.url.query)
    status, response_headers, body = await asyncio.to_thread(
        _fetch_upstream,
        request.method,
        url,
        upstream_headers,
    )
    return Response(content=body, status_code=status, headers=response_headers)
