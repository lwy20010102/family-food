from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.family import Family
from app.models.user import User
from app.schemas.family import (
    CreateFamilyRequest,
    CurrentFamilyResponse,
    FamilyMemberPublic,
    FamilyMembersResponse,
    FamilyPublic,
    JoinFamilyRequest,
    UpdateMealRoleRequest,
)
from app.services.family_service import (
    add_member_to_family,
    create_family_for_user,
    get_family_by_invite_code,
    get_user_family,
    get_user_membership,
    list_family_members,
    update_family_member_meal_role,
    update_user_meal_role,
)

router = APIRouter(prefix="/families", tags=["families"])


def _serialize_family(family: Family | None) -> CurrentFamilyResponse:
    if family is None:
        return CurrentFamilyResponse()

    return CurrentFamilyResponse(
        family=FamilyPublic.model_validate(family),
        members=[FamilyMemberPublic.model_validate(member) for member in family.members],
    )


def _ensure_user_without_family(db: Session, current_user: User) -> None:
    if get_user_membership(db, current_user.id) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="你已经加入家庭，不能重复创建或加入",
        )


@router.get("/current", response_model=CurrentFamilyResponse)
def current_family(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentFamilyResponse:
    family = get_user_family(db, current_user.id)
    return _serialize_family(family)


@router.get("/members", response_model=FamilyMembersResponse)
def family_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FamilyMembersResponse:
    family = get_user_family(db, current_user.id)
    if family is None:
        return FamilyMembersResponse()

    return FamilyMembersResponse(
        members=[
            FamilyMemberPublic.model_validate(member)
            for member in list_family_members(db, family.id)
        ],
    )


@router.patch("/members/me/meal-role", response_model=FamilyMemberPublic)
def update_my_meal_role(
    payload: UpdateMealRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FamilyMemberPublic:
    try:
        member = update_user_meal_role(db, current_user.id, payload.meal_role)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return FamilyMemberPublic.model_validate(member)


@router.patch("/members/{member_id}/meal-role", response_model=FamilyMemberPublic)
def update_family_member_meal_role_endpoint(
    member_id: int,
    payload: UpdateMealRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FamilyMemberPublic:
    try:
        member = update_family_member_meal_role(
            db,
            current_user.id,
            member_id,
            payload.meal_role,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return FamilyMemberPublic.model_validate(member)


@router.post("", response_model=CurrentFamilyResponse, status_code=status.HTTP_201_CREATED)
def create_family(
    payload: CreateFamilyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentFamilyResponse:
    _ensure_user_without_family(db, current_user)
    try:
        family = create_family_for_user(db, current_user, payload.name)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return _serialize_family(family)


@router.post("/join", response_model=CurrentFamilyResponse)
def join_family(
    payload: JoinFamilyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentFamilyResponse:
    _ensure_user_without_family(db, current_user)

    family = get_family_by_invite_code(db, payload.invite_code)
    if family is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邀请码不存在",
        )

    try:
        family = add_member_to_family(db, family, current_user)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return _serialize_family(family)
