from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.models import Order, OrderFarmerAllocation, Review, User
from app.schemas.review import ReviewCreate, ReviewOut

router = APIRouter()


def _resolve_target_user_id(order: Order, current_user: User, payload: ReviewCreate) -> UUID:
    """
    Resolves the correct `users.id` being reviewed from the order's own relationships,
    rather than trusting a client-supplied user id. See `ReviewCreate` for the contract.
    """
    user_is_buyer = order.buyer and order.buyer.user_id == current_user.id

    if user_is_buyer:
        allocations = order.allocations
        if payload.target_farmer_id is not None:
            match = next((a for a in allocations if a.farmer_id == payload.target_farmer_id), None)
            if not match or not match.farmer:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="target_farmer_id is not a farmer allocated on this order.",
                )
            return match.farmer.user_id
        if len(allocations) == 1 and allocations[0].farmer:
            return allocations[0].farmer.user_id
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order has multiple farmers; specify target_farmer_id.",
        )

    # Reviewer is the farmer: the only valid target is the buyer on this order.
    if not order.buyer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order has no buyer to review.")
    return order.buyer.user_id


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a rating & review for an order counterparty (identity resolved server-side)."""
    stmt_order = (
        select(Order)
        .options(
            selectinload(Order.buyer),
            selectinload(Order.allocations).selectinload(OrderFarmerAllocation.farmer),
        )
        .where(Order.id == payload.order_id)
    )
    res_order = await db.execute(stmt_order)
    order = res_order.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    user_is_buyer = order.buyer and order.buyer.user_id == current_user.id
    user_is_farmer = current_user.farmer_profile and any(
        alloc.farmer_id == current_user.farmer_profile.id for alloc in order.allocations
    )

    if not (user_is_buyer or user_is_farmer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to submit a review for this order.",
        )

    target_user_id = _resolve_target_user_id(order, current_user, payload)

    if target_user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot review yourself.")

    # Check for duplicate review by same author for same order (+ target, for multi-farmer orders)
    stmt_dup = select(Review).where(
        Review.order_id == payload.order_id,
        Review.author_id == current_user.id,
        Review.target_id == target_user_id,
    )
    res_dup = await db.execute(stmt_dup)
    if res_dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review already submitted for this order.",
        )

    review = Review(
        order_id=payload.order_id,
        author_id=current_user.id,
        target_id=target_user_id,
        rating_score=payload.rating_score,
        feedback_text=payload.feedback_text,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    return ReviewOut(
        id=review.id,
        order_id=review.order_id,
        author_id=review.author_id,
        target_id=review.target_id,
        rating_score=review.rating_score,
        feedback_text=review.feedback_text,
        created_at=review.created_at,
    )


@router.get("/user/{user_id}", response_model=List[ReviewOut])
async def get_reviews_for_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all ratings & reviews received by a target user."""
    stmt = select(Review).where(Review.target_id == user_id).order_by(Review.created_at.desc())
    res = await db.execute(stmt)
    reviews = res.scalars().all()

    return [
        ReviewOut(
            id=r.id,
            order_id=r.order_id,
            author_id=r.author_id,
            target_id=r.target_id,
            rating_score=r.rating_score,
            feedback_text=r.feedback_text,
            created_at=r.created_at,
        )
        for r in reviews
    ]
