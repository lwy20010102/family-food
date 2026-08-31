from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.dietary_preference import (
    DietaryPreferenceResponse,
    DietaryPreferenceUpdateRequest,
)
from app.services.dietary_preference_service import (
    get_dietary_preference,
    upsert_dietary_preference,
)

router = APIRouter(prefix="/dietary-preferences", tags=["dietary-preferences"])


@router.get("", response_model=DietaryPreferenceResponse)
def read_dietary_preference(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DietaryPreferenceResponse:
    preference = get_dietary_preference(db, current_user.id)
    return DietaryPreferenceResponse(preference=preference)


@router.put("", response_model=DietaryPreferenceResponse)
def save_dietary_preference(
    payload: DietaryPreferenceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DietaryPreferenceResponse:
    preference = upsert_dietary_preference(db, current_user.id, payload)
    return DietaryPreferenceResponse(preference=preference)
