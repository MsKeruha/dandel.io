from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import requests
import os
from typing import List, Optional
import math
from database import get_db
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import or_
import models
import schemas
import routers.auth as auth
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/admin/fleet", tags=["Admin Fleet"])

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

@router.get("/vehicles", response_model=schemas.PaginatedResponse[schemas.VehicleResponse])
def get_all_vehicles(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Отримати весь список автомобілів компанії (Тільки для адмінів) з пагінацією."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостатньо прав для перегляду автопарку")
        
    query = db.query(models.Vehicle)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Vehicle.plate.ilike(search_term),
                models.Vehicle.model.ilike(search_term),
                models.Vehicle.type.ilike(search_term)
            )
        )
        
    total = query.count()
    items = query.order_by(models.Vehicle.id.asc()).offset(skip).limit(limit).all()
    pages = math.ceil(total / limit) if limit > 0 else 0
    
    # Завантажуємо поточні доставки
    for v in items:
        if v.status == "In_Transit":
            active_del = db.query(models.Delivery).filter(
                models.Delivery.vehicle_id == v.id,
                models.Delivery.status.in_(["Created", "Processing", "In_Transit", "Customs"])
            ).first()
            if active_del:
                v.active_delivery = active_del

    return {
        "total": total,
        "items": items,
        "page": (skip // limit) + 1,
        "size": limit,
        "pages": pages
    }

@router.post("/vehicles", response_model=schemas.VehicleResponse)
def add_vehicle(
    vehicle: schemas.VehicleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Додати новий автомобіль до автопарку (Тільки для адмінів)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостатньо прав для керування автопарком")
    
    db_vehicle = db.query(models.Vehicle).filter(models.Vehicle.plate == vehicle.plate).first()
    if db_vehicle:
        raise HTTPException(status_code=400, detail="Автомобіль з таким номером вже існує")
    
    new_vehicle = models.Vehicle(**vehicle.model_dump())
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return new_vehicle

@router.delete("/vehicles/{vehicle_id}")
def remove_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Видалити автомобіль з бази (Тільки для адмінів)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостатньо прав для керування автопарком")
    
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Автомобіль не знайдено")
    
    db.delete(vehicle)
    db.commit()
    return {"message": "Автомобіль успішно видалено"}

@router.get("/search-city", response_model=List[schemas.GeocodeResult])
def search_city(q: str, db: Session = Depends(get_db)):
    """Глобальний пошук міст через Nominatim (OpenStreetMap) з серверним кешуванням на 7 днів."""
    query_norm = q.lower().strip()
    
    # 1. Перевірка кешу в базі
    cache_entry = db.query(models.CityCache).filter(models.CityCache.query == query_norm).first()
    if cache_entry:
        # Перевірка TTL (7 днів)
        if datetime.utcnow() - cache_entry.updated_at < timedelta(days=7):
            return json.loads(cache_entry.results_json)
        else:
            # Видаляємо старий кеш
            db.delete(cache_entry)
            db.commit()

    # 2. Якщо в кеші немає або застаріло — йдемо в Nominatim
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": q,
        "format": "json",
        "addressdetails": 1,
        "limit": 8,
        "accept-language": "uk"
    }
    headers = {
        "User-Agent": "dandel.io-logistics-app/1.0"
    }
    
    try:
        r = requests.get(url, params=params, headers=headers, timeout=5)
        if r.ok:
            data = r.json()
            results = []
            for item in data:
                addr = item.get("address", {})
                city_name = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or item.get("display_name").split(",")[0]
                
                results.append({
                    "name": city_name,
                    "full_address": item.get("display_name"),
                    "country": addr.get("country", ""),
                    "state": addr.get("state"),
                    "lat": float(item.get("lat")),
                    "lon": float(item.get("lon"))
                })
            
            # 3. Зберігаємо в кеш
            if results:
                new_cache = models.CityCache(
                    query=query_norm,
                    results_json=json.dumps(results)
                )
                db.add(new_cache)
                db.commit()
                
            return results
        return []
    except Exception as e:
        print(f"Geocoding error: {e}. Використовуємо локальний fallback.")
        # Локальний fallback для критичних міст при відсутності мережі
        FALLBACK = [
            {"name": "Київ", "full_address": "Київ, Україна", "country": "Україна", "lat": 50.4501, "lon": 30.5234},
            {"name": "Львів", "full_address": "Львів, Україна", "country": "Україна", "lat": 49.8397, "lon": 24.0297},
            {"name": "Одеса", "full_address": "Одеса, Україна", "country": "Україна", "lat": 46.4825, "lon": 30.7233},
            {"name": "Харків", "full_address": "Харків, Україна", "country": "Україна", "lat": 49.9935, "lon": 36.2304},
            {"name": "Дніпро", "full_address": "Дніпро, Україна", "country": "Україна", "lat": 48.4647, "lon": 35.0462},
            {"name": "Варшава", "full_address": "Варшава, Польща", "country": "Польща", "lat": 52.2297, "lon": 21.0122},
            {"name": "Берлін", "full_address": "Берлін, Німеччина", "country": "Німеччина", "lat": 52.5200, "lon": 13.4050}
        ]
        return [c for c in FALLBACK if query_norm in c["name"].lower() or query_norm in c["full_address"].lower()]
