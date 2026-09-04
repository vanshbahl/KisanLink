from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_buyer
from app.models import User, BuyerRequirement
from app.schemas.match import DynamicClusterOut
from app.services.matching_service import MatchingEngine

router = APIRouter(prefix="/requirements", tags=["Matching"])


@router.post("/{id}/generate-matches", response_model=DynamicClusterOut)
async def generate_matches_for_requirement(
    id: UUID,
    current_user: User = Depends(require_buyer),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes multi-criteria sourcing matching algorithm to formulate a Dynamic Supply Cluster
    for a buyer procurement requirement.
    """
    if not current_user.buyer_profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Buyer profile required.")

    stmt = select(BuyerRequirement).where(BuyerRequirement.id == id)
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer requirement not found.")

    if req.buyer_id != current_user.buyer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to generate matches for this requirement.",
        )

    try:
        cluster_out = await MatchingEngine.generate_and_save_cluster(db=db, requirement=req)
        return cluster_out
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
