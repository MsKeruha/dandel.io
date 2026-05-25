import os
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import User, BonusTransaction, Delivery
from schemas import UserResponse, BonusTransactionResponse, LoyaltyLevelResponse, PaginatedResponse, UserUpdate, AdminDriverResponse
from routers.auth import get_current_user
import uuid

router = APIRouter(
    prefix="/api/users",
    tags=["Users & Bonuses"]
)

# Створимо директорію для аватарів, якщо немає
os.makedirs("data/avatars", exist_ok=True)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    if user_update.address is not None:
        current_user.address = user_update.address
    if hasattr(user_update, 'avatar_url') and user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    if user_update.password is not None and user_update.password.strip() != "":
        from routers.auth import get_password_hash
        current_user.hashed_password = get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Файл повинен бути зображенням")
        
    ext = file.filename.split(".")[-1]
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = f"data/avatars/{filename}"
    
    with open(filepath, "wb") as f:
        f.write(await file.read())
        
    current_user.avatar_url = f"/api/users/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user

from fastapi.responses import FileResponse

@router.get("/avatars/{filename}")
def get_avatar(filename: str):
    filepath = f"data/avatars/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Аватар не знайдено")
    return FileResponse(filepath)

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


@router.get("/admin/drivers", response_model=PaginatedResponse[AdminDriverResponse])
def admin_get_all_drivers(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    
    query = db.query(User).filter(User.role == "driver")

    if search:
        search_term = f"%{search}%"
        if search.isdigit():
            query = query.filter(
                or_(
                    User.id == int(search),
                    User.email.ilike(search_term),
                    User.full_name.ilike(search_term),
                    User.phone.ilike(search_term)
                )
            )
        else:
            query = query.filter(
                or_(
                    User.email.ilike(search_term),
                    User.full_name.ilike(search_term),
                    User.phone.ilike(search_term)
                )
            )

    query = query.order_by(User.id.asc())
    
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    pages = math.ceil(total / limit) if limit > 0 else 0

    result = []
    for u in users:
        active_deliveries = db.query(Delivery).filter(
            Delivery.driver_id == u.id,
            Delivery.status.in_(["Created", "Processing", "In_Transit", "Customs"])
        ).all()
        
        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "status": "Active" if len(active_deliveries) > 0 else "Available",
            "active_deliveries": [
                {
                    "id": d.id,
                    "cargo_name": d.cargo_name,
                    "origin_city": d.origin_city,
                    "destination_city": d.destination_city,
                    "status": d.status
                } for d in active_deliveries
            ]
        })

    return {
        "total": total,
        "items": result,
        "page": (skip // limit) + 1,
        "size": limit,
        "pages": pages
    }


@router.get("/admin/all", response_model=PaginatedResponse[UserResponse])
def admin_get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    
    query = db.query(User)

    if role and role != "ALL":
        query = query.filter(User.role == role)

    if search:
        search_term = f"%{search}%"
        if search.isdigit():
            query = query.filter(
                or_(
                    User.id == int(search),
                    User.email.ilike(search_term),
                    User.full_name.ilike(search_term)
                )
            )
        else:
            query = query.filter(
                or_(
                    User.email.ilike(search_term),
                    User.full_name.ilike(search_term)
                )
            )

    if sort_by:
        column = getattr(User, sort_by, None)
        if column is not None:
            if sort_desc:
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column.asc())
        else:
            query = query.order_by(User.id.asc())
    else:
        query = query.order_by(User.id.asc())

    total = query.count()
    items = query.offset(skip).limit(limit).all()
    pages = math.ceil(total / limit) if limit > 0 else 0

    return {
        "total": total,
        "items": items,
        "page": (skip // limit) + 1,
        "size": limit,
        "pages": pages
    }

