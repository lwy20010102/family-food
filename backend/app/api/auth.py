from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    LoginRequest,
    LogoutResponse,
    RegisterRequest,
    UserPublic,
)
from app.services.auth_service import (
    authenticate_user,
    create_user,
    get_user_by_email,
    get_user_by_username,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_public(user: User) -> UserPublic:
    return UserPublic.model_validate(user)


def _set_auth_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path=settings.auth_cookie_path,
        max_age=settings.access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthSessionResponse:
    if get_user_by_username(db, payload.username) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在",
        )
    if get_user_by_email(db, payload.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已注册",
        )

    user = create_user(db, payload)
    token = create_access_token(str(user.id))
    _set_auth_cookie(response, token)
    return AuthSessionResponse(user=_user_public(user))


@router.post("/login", response_model=AuthSessionResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthSessionResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
        )

    token = create_access_token(str(user.id))
    _set_auth_cookie(response, token)
    return AuthSessionResponse(user=_user_public(user))


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return _user_public(current_user)


@router.post("/logout", response_model=LogoutResponse)
def logout(response: Response) -> LogoutResponse:
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path=settings.auth_cookie_path,
    )
    return LogoutResponse(message="已退出登录")
