from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, BonusTransaction
from schemas import UserResponse, BonusTransactionResponse, LoyaltyLevelResponse
from routers.auth import get_current_user

router = APIRouter(
    prefix="/api/users",
    tags=["Users & Bonuses"]
)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/me/bonuses", response_model=List[BonusTransactionResponse])
def get_bonus_history(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    return db.query(BonusTransaction).filter(
        BonusTransaction.user_id == current_user.id
    ).order_by(BonusTransaction.created_at.desc()).all()

@router.get("/loyalty-levels", response_model=List[LoyaltyLevelResponse])
def get_loyalty_levels(
    db: Session = Depends(get_db)
):
    from models import LoyaltyLevel
    return db.query(LoyaltyLevel).order_by(LoyaltyLevel.min_bonuses.asc()).all()


@router.get("/admin/all", response_model=List[UserResponse])
def admin_get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    return db.query(User).order_by(User.id.asc()).all()

