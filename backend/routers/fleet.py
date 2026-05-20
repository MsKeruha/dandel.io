from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import requests
import os
from typing import List
from database import get_db
import models
import schemas
import routers.auth as auth

router = APIRouter(prefix="/api/admin/fleet", tags=["Admin Fleet"])

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

@router.get("/vehicles", response_model=List[schemas.VehicleResponse])
def get_all_vehicles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Отримати весь список автомобілів компанії (Тільки для адмінів)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостатньо прав для перегляду автопарку")
    return db.query(models.Vehicle).all()

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
def search_city(q: str):
    """Глобальний пошук міст через Nominatim (OpenStreetMap).
    Більш доречно для логістики та не потребує API-ключів.
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": q,
        "format": "json",
        "addressdetails": 1,
        "limit": 5,
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
                # Беремо назву міста або населеного пункту
                city_name = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or item.get("display_name").split(",")[0]
                
                results.append({
                    "name": city_name,
                    "country": addr.get("country", ""),
                    "state": addr.get("state"),
                    "lat": float(item.get("lat")),
                    "lon": float(item.get("lon"))
                })
            return results
        return []
    except Exception as e:
        print(f"Geocoding error: {e}")
        return []
