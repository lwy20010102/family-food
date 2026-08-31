from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.family_stats import FamilyMonthlyStatsResponse
from app.services.family_service import get_user_workspace
from app.services.family_stats_service import build_monthly_family_stats

router = APIRouter(prefix="/family-stats", tags=["family-stats"])


@router.get("/monthly", response_model=FamilyMonthlyStatsResponse)
def get_monthly_family_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FamilyMonthlyStatsResponse:
    family = get_user_workspace(db, current_user.id)
    return FamilyMonthlyStatsResponse(
        stats=build_monthly_family_stats(db, family),
    )
