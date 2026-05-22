import math
import random
import urllib.request
import json
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from schemas import DeliveryCalculateRequest, DeliveryCalculateResponse, DeliveryCreate, DeliveryResponse, ScenarioDetails, RiskZoneResponse, DeliveryGuestResponse, Token, PaginatedResponse, AdminDeliveryResponse
from routers.auth import get_current_user, get_optional_current_user, get_password_hash, create_access_token
from database import get_db
from models import User, RiskZone, Delivery, BonusTransaction, Vehicle
import string

router = APIRouter(
    prefix="/api/deliveries",
    tags=["Deliveries & Calculations"]
)

def update_dynamic_statuses(db: Session):
    deliveries = db.query(Delivery).filter(Delivery.status.notin_(['Delivered', 'Cancelled'])).all()
    for deliv in deliveries:
        if not deliv.created_at or not deliv.duration_hours:
            continue
            
        now = datetime.datetime.utcnow()
        elapsed = (now - deliv.created_at.replace(tzinfo=None)).total_seconds() / 3600.0
        total_h = deliv.duration_hours
        
        if elapsed >= total_h:
            deliv.status = 'Delivered'
            # Звільняємо авто
            if deliv.vehicle_id:
                veh = db.query(Vehicle).filter(Vehicle.id == deliv.vehicle_id).first()
                if veh:
                    veh.status = 'Available'
        elif elapsed >= total_h * 0.8 and deliv.is_cross_border:
            deliv.status = 'Customs'
        elif elapsed >= total_h * 0.3:
            deliv.status = 'In_Transit'
        elif elapsed >= total_h * 0.1:
            deliv.status = 'Processing'
    
    db.commit()

# Допоміжна функція для розрахунку відстані (формула Гаверсинуса)
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Радіус Землі в км
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Допоміжна функція для отримання маршруту, відстані та часу з OSRM
def get_route_data(start: List[float], end: List[float], scenario: str):
    
    # Визначаємо проміжні точки для створення різних маршрутів
    waypoints = f"{start[1]},{start[0]}"
    
    # Розрахунок дельти для пропорційного зміщення (перпендикуляр)
    dlat = end[0] - start[0]
    dlng = end[1] - start[1]
    
    if scenario == "Економ":
        # Економ іде з відхиленням для заїзду в хаби (широкий об'їзд)
        mid_lat = (start[0] + end[0]) / 2 + dlng * 0.2
        mid_lng = (start[1] + end[1]) / 2 - dlat * 0.2
        waypoints += f";{mid_lng},{mid_lat}"
    elif scenario == "Безпечний":
        # Безпечний злегка об'їжджає в інший бік (уникаючи центральних небезпечних трас)
        mid_lat = (start[0] + end[0]) / 2 - dlng * 0.15
        mid_lng = (start[1] + end[1]) / 2 + dlat * 0.15
        waypoints += f";{mid_lng},{mid_lat}"
        
    waypoints += f";{end[1]},{end[0]}"
    
    url = f"https://router.project-osrm.org/route/v1/driving/{waypoints}?overview=full&geometries=geojson"
    
    # Дефолтні значення (пряма лінія)
    direct_dist = calculate_distance(start[0], start[1], end[0], end[1])
    result = {
        "points": [start, end],
        "distance": direct_dist,
        "duration": direct_dist / 60.0
    }
        
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data.get("routes") and len(data["routes"]) > 0:
                route = data["routes"][0]
                coords = route["geometry"]["coordinates"]
                pts = [[c[1], c[0]] for c in coords]
                
                result["points"] = pts
                result["distance"] = route["distance"] / 1000.0 # в км
                result["duration"] = route["duration"] / 3600.0 # в годинах
    except Exception as e:
        print(f"OSRM Error: {e}")
        
    return result

@router.get("/risk-zones", response_model=List[RiskZoneResponse])
def get_risk_zones(db: Session = Depends(get_db)):
    return db.query(RiskZone).filter(RiskZone.is_active == True).all()

@router.post("/calculate", response_model=DeliveryCalculateResponse)
def calculate_options(req: DeliveryCalculateRequest):
    start_coords = [req.origin_lat, req.origin_lng]
    end_coords = [req.destination_lat, req.destination_lng]
    
    distance = calculate_distance(start_coords[0], start_coords[1], end_coords[0], end_coords[1])
    if distance < 1.0:
        raise HTTPException(status_code=400, detail="Місто відправлення та призначення не можуть збігатися")

    # 1. Отримуємо дані маршруту для кожного сценарію
    express_data = get_route_data(start_coords, end_coords, "Експрес")
    econ_data = get_route_data(start_coords, end_coords, "Економ")
    safe_data = get_route_data(start_coords, end_coords, "Безпечний")
    
    # ⚡ Експрес (Літак + кур'єр)
    express_dist = express_data["distance"]
    express_price = 500.0 + (express_dist * 18.0) + (req.weight * 40.0) + (req.declared_value * 0.01)
    express_time = express_data["duration"] * 0.9 + 1.0  # найшвидше, + 1 год на обробку
    express_safety = 8.5
    express_eco = express_dist * 0.42 + (req.weight * 0.15)  # високий вуглецевий слід
    
    # 🌱 Економ (Збірний вантаж)
    econ_dist = econ_data["distance"]
    econ_price = 150.0 + (econ_dist * 4.5) + (req.weight * 12.0) + (req.declared_value * 0.005)
    econ_time = econ_data["duration"] * 1.5 + 12.0  # збірні склади (хаби) + повільніше їхати
    econ_safety = 7.0
    econ_eco = econ_dist * 0.11 + (req.weight * 0.03)  # екологічно
    
    # 🛡️ Безпечний (Обхід зон ризику, спеціальний моніторинг)
    safe_dist = safe_data["distance"]
    safe_price = 300.0 + (safe_dist * 10.0) + (req.weight * 22.0) + (req.declared_value * 0.008)
    safe_time = safe_data["duration"] * 1.2 + 2.0  # додатковий час на чекпоінти
    safe_safety = 9.8  # Оптимальний безпечний маршрут
    safe_eco = safe_dist * 0.21 + (req.weight * 0.07)  # помірні викиди

    # Формуємо сирі дані для нормалізації
    scenarios_raw = {
        "Експрес": {
            "price": express_price,
            "time": express_time,
            "safety": express_safety,
            "eco": express_eco,
            "escort_available": False,
            "description": "Швидка кур'єрська доставка прямим авіа/авто сполученням.",
            "route_points": express_data["points"]
        },
        "Економ": {
            "price": econ_price,
            "time": econ_time,
            "safety": econ_safety,
            "eco": econ_eco,
            "escort_available": False,
            "description": "Вигідна доставка консолідованого вантажу через мережу складів.",
            "route_points": econ_data["points"]
        },
        "Безпечний": {
            "price": safe_price,
            "time": safe_time,
            "safety": safe_safety,
            "eco": safe_eco,
            "escort_available": True,
            "description": "Маршрут сплановано в обхід військових ризиків. Додано фотоконтроль на ключових вузлах.",
            "route_points": safe_data["points"]
        }
    }

    # 2. Алгоритм SAW (Simple Additive Weighting) - Мультикритеріальна оптимізація
    # Для SAW потрібні нормалізовані значення:
    # - Ціна, Час, Екологічність мінімізуються (менше = краще) -> Min/Value
    # - Безпека максимізується (більше = краще) -> Value/Max
    
    min_price = min(s["price"] for s in scenarios_raw.values())
    min_time = min(s["time"] for s in scenarios_raw.values())
    min_eco = min(s["eco"] for s in scenarios_raw.values())
    max_safety = 9.8
    
    # Сума ваг повинна дорівнювати 1
    # Робимо експоненційне посилення (щоб 100% швидкість дійсно домінувала)
    pw = req.price_weight ** 1.5
    tw = req.time_weight ** 1.5
    sw = req.safety_weight ** 1.5
    ew = req.eco_weight ** 1.5
    
    w_sum = pw + tw + sw + ew
    w_p = pw / w_sum if w_sum > 0 else 0.25
    w_t = tw / w_sum if w_sum > 0 else 0.25
    w_s = sw / w_sum if w_sum > 0 else 0.25
    w_e = ew / w_sum if w_sum > 0 else 0.25

    calculated_scenarios: List[ScenarioDetails] = []
    
    for name, data in scenarios_raw.items():
        # Нормалізація критеріїв
        norm_price = min_price / data["price"]
        norm_time = min_time / data["time"]
        norm_eco = min_eco / data["eco"]
        norm_safety = data["safety"] / max_safety
        
        # Розрахунок SAW Score
        saw_score = (w_p * norm_price) + (w_t * norm_time) + (w_s * norm_safety) + (w_e * norm_eco)
        
        # Округляємо для краси
        saw_score = round(saw_score, 3)
        
        calculated_scenarios.append(ScenarioDetails(
            scenario=name,
            price=round(data["price"], 2),
            duration_hours=round(data["time"], 1),
            safety_score=round(data["safety"], 1),
            co2_footprint=round(data["eco"], 2),
            escort_available=data["escort_available"],
            description=data["description"],
            route_points=data["route_points"],
            saw_score=saw_score
        ))

    # Рекомендований сценарій - той, що має найвищу оцінку SAW
    calculated_scenarios.sort(key=lambda s: s.saw_score, reverse=True)
    recommended = calculated_scenarios[0].scenario

    return DeliveryCalculateResponse(
        origin=req.origin_city,
        destination=req.destination_city,
        scenarios=calculated_scenarios,
        recommended_scenario=recommended
    )


@router.post("/create", response_model=DeliveryGuestResponse)
def create_delivery(
    order_in: DeliveryCreate, 
    db: Session = Depends(get_db), 
    current_user: User | None = Depends(get_optional_current_user)
):
    # Логіка авто-реєстрації для гостей
    generated_password = None
    token_data = None
    
    if not current_user:
        # Генеруємо пошту з телефону якщо її немає (або просто dummy email)
        phone_clean = ''.join(filter(str.isdigit, order_in.receiver_phone))
        guest_email = f"guest_{phone_clean}@dandel.io"
        
        # Перевіряємо чи вже є
        db_user = db.query(User).filter(User.email == guest_email).first()
        if not db_user:
            generated_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            hashed_pw = get_password_hash(generated_password)
            
            from models import LoyaltyLevel
            default_level = db.query(LoyaltyLevel).filter(LoyaltyLevel.name == "Насіння").first()
            
            db_user = User(
                email=guest_email,
                full_name=order_in.sender_name,
                hashed_password=hashed_pw,
                role="customer",
                bonuses_balance=100.0,
                loyalty_level_id=default_level.id if default_level else None
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
        current_user = db_user
        
        # Генеруємо токен
        access_token = create_access_token(data={"sub": current_user.email})
        token_data = Token(access_token=access_token, token_type="bearer", user=current_user)

    # Отримуємо маршрут для збереження координат
    start_coords = [order_in.origin_lat, order_in.origin_lng]
    end_coords = [order_in.destination_lat, order_in.destination_lng]
    
    distance = calculate_distance(start_coords[0], start_coords[1], end_coords[0], end_coords[1])
    if distance < 1.0:
        distance = 1.0

    # Спрощений підрахунок вартості
    if order_in.scenario == "Експрес":
        price = 500.0 + (distance * 18.0) + (order_in.weight * 40.0) + (order_in.declared_value * 0.01)
        time_h = max(3.0, distance / 85.0)
        safety = 8.5
        co2 = distance * 0.42 + (order_in.weight * 0.15)
    elif order_in.scenario == "Економ":
        price = 150.0 + (distance * 4.5) + (order_in.weight * 12.0) + (order_in.declared_value * 0.005)
        time_h = max(18.0, distance / 40.0) + 12.0
        safety = 7.0
        co2 = distance * 0.11 + (order_in.weight * 0.03)
    else:  # Безпечний
        price = 300.0 + (distance * 10.0) + (order_in.weight * 22.0) + (order_in.declared_value * 0.008)
        time_h = max(8.0, distance / 55.0) + 2.0
        safety = 9.8
        co2 = distance * 0.21 + (order_in.weight * 0.07)
        if order_in.escort_requested:
            price += 1500.0  # додаткова плата за охоронну компанію
            safety = 10.0

    # Застосування бонусів
    bonuses_to_spend = 0.0
    if order_in.use_bonuses and current_user.bonuses_balance > 0:
        # Можна списати максимум 50% від вартості замовлення або всю суму бонусів, якщо вона менша
        max_bonuses_allowed = price * 0.5
        bonuses_to_spend = min(current_user.bonuses_balance, max_bonuses_allowed)
        
        # Списуємо з балансу
        current_user.bonuses_balance -= bonuses_to_spend
        
        # Записуємо трансакцію
        tx = BonusTransaction(
            user_id=current_user.id,
            amount=-bonuses_to_spend,
            description=f"Списання бонусів на замовлення доставки вантажу {order_in.cargo_name}"
        )
        db.add(tx)

    final_price = price - bonuses_to_spend
    
    # Нарахування бонусів (5% від суми, яку РЕАЛЬНО сплатив користувач)
    bonuses_earned = round(final_price * 0.05, 2)
    current_user.bonuses_balance += bonuses_earned
    
    # Оновлення лояльності користувача за накопичувальним принципом
    # Для симуляції рахуємо суму всіх нарахованих раніше бонусів + нові
    from sqlalchemy import func
    total_earned_query = db.query(func.sum(BonusTransaction.amount)).filter(
        BonusTransaction.user_id == current_user.id, 
        BonusTransaction.amount > 0
    ).scalar()
    
    total_earned = (total_earned_query or 0.0) + bonuses_earned
    
    # Визначаємо рівень лояльності з бази даних на основі суми накопичених бонусів
    from models import LoyaltyLevel
    matching_level = db.query(LoyaltyLevel).filter(
        LoyaltyLevel.min_bonuses <= total_earned
    ).order_by(LoyaltyLevel.min_bonuses.desc()).first()
    
    if matching_level:
        current_user.loyalty_level_id = matching_level.id

    # Записуємо трансакцію нарахування
    tx_earn = BonusTransaction(
        user_id=current_user.id,
        amount=bonuses_earned,
        description=f"Нарахування 5% кешбеку за доставку {order_in.cargo_name}"
    )
    db.add(tx_earn)



    # Створюємо саму доставку
    from models import Vehicle
    
    # Шукаємо вільну машину з достатньою вантажопідйомністю
    vehicle = db.query(Vehicle).filter(
        Vehicle.status == "Available",
        Vehicle.capacity_kg >= order_in.weight
    ).first()
    
    vehicle_id = None
    if vehicle:
        vehicle_id = vehicle.id
        vehicle.status = "In_Transit"

    new_delivery = Delivery(
        sender_id=current_user.id,
        cargo_name=order_in.cargo_name,
        cargo_type=order_in.cargo_type,
        weight=order_in.weight,
        declared_value=order_in.declared_value,
        is_cross_border=order_in.is_cross_border,
        origin_city=order_in.origin_city,
        destination_city=order_in.destination_city,
        origin_lat=order_in.origin_lat,
        origin_lng=order_in.origin_lng,
        destination_lat=order_in.destination_lat,
        destination_lng=order_in.destination_lng,
        sender_name=order_in.sender_name,
        receiver_name=order_in.receiver_name,
        receiver_phone=order_in.receiver_phone,
        sender_address=order_in.sender_address,
        scenario=order_in.scenario,
        escort_requested=order_in.escort_requested,
        status="Created",
        current_lat=order_in.origin_lat,
        current_lng=order_in.origin_lng,
        price=final_price,
        duration_hours=time_h,
        safety_score=safety,
        co2_footprint=co2,
        bonuses_spent=bonuses_to_spend,
        bonuses_earned=bonuses_earned,
        vehicle_id=vehicle_id
    )
    
    # Додаємо координати відправлення
    new_delivery.current_lat = start_coords[0]
    new_delivery.current_lng = start_coords[1]

    db.add(new_delivery)
    db.commit()
    db.refresh(new_delivery)
    
    # Пов'язуємо трансакції з доставкою
    tx_earn.delivery_id = new_delivery.id
    if bonuses_to_spend > 0:
        tx.delivery_id = new_delivery.id
    db.commit()
    # Оновлюємо кеш користувача в токені якщо використовувались бонуси
    if order_in.use_bonuses and token_data:
        token_data.user.bonuses_balance = current_user.bonuses_balance

    return DeliveryGuestResponse(
        delivery=new_delivery,
        token=token_data,
        generated_password=generated_password
    )


@router.get("/my", response_model=List[DeliveryResponse])
def get_my_deliveries(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    update_dynamic_statuses(db)
    return db.query(Delivery).filter(Delivery.sender_id == current_user.id).order_by(Delivery.created_at.desc()).all()


# Спеціальний роут для симуляції оновлення статусу доставки та додавання фото чекпоінтів
@router.post("/{delivery_id}/simulate-step", response_model=DeliveryResponse)
def simulate_delivery_step(
    delivery_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id, Delivery.sender_id == current_user.id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Доставку не знайдено")
        
    if delivery.status == "Delivered":
        return delivery
        
    start_c = [delivery.origin_lat, delivery.origin_lng]
    end_c = [delivery.destination_lat, delivery.destination_lng]

    # Симулюємо зміну статусів: Created -> Processing -> In_Transit -> (Customs якщо кордон) -> Delivered
    status_flow = ["Created", "Processing", "In_Transit"]
    if delivery.is_cross_border:
        status_flow.append("Customs")
    status_flow.append("Delivered")

    try:
        current_idx = status_flow.index(delivery.status)
        next_idx = current_idx + 1
    except ValueError:
        next_idx = 0

    if next_idx < len(status_flow):
        next_status = status_flow[next_idx]
        delivery.status = next_status
        
        # Симулюємо переміщення координат
        progress = next_idx / (len(status_flow) - 1)
        delivery.current_lat = start_c[0] + (end_c[0] - start_c[0]) * progress
        delivery.current_lng = start_c[1] + (end_c[1] - start_c[1]) * progress
        
        # Для безпечного типу генеруємо лінк на фото контролю (насіння на вітрі / вантаж у дорозі!)
        if next_status == "In_Transit":
            delivery.photo_proof = f"https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80"
        elif next_status == "Customs":
            delivery.photo_proof = f"https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80"
        elif next_status == "Delivered":
            delivery.photo_proof = f"https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80"
            
    db.commit()
    db.refresh(delivery)
from sqlalchemy import func

@router.get("/admin/stats")
def admin_get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ заборонено")
        
    total_del = db.query(Delivery).count()
    active_del = db.query(Delivery).filter(Delivery.status != 'Delivered').count()
    
    # Bonuses paid (total earned)
    total_bonuses = db.query(func.sum(Delivery.bonuses_earned)).scalar() or 0
    
    # CO2 saved (rough estimate from the frontend logic: baseCo2 = weight * 0.42, saved = baseCo2 - co2_footprint)
    # We can calculate this in python to avoid complex SQL
    deliveries = db.query(Delivery.weight, Delivery.co2_footprint).all()
    total_co2_saved = sum(max(0, (d.weight * 0.42) - d.co2_footprint) for d in deliveries)

    return {
        "totalDeliveries": total_del,
        "activeDeliveries": active_del,
        "totalBonusesPaid": total_bonuses,
        "totalCo2Saved": total_co2_saved
    }

@router.get("/admin/all", response_model=PaginatedResponse[AdminDeliveryResponse])
def admin_get_all_deliveries(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ заборонено")
        
    update_dynamic_statuses(db)
    
    query = db.query(Delivery)

    if status and status != "ALL":
        query = query.filter(Delivery.status == status)

    if search:
        search_term = f"%{search}%"
        # Checking if search is an ID (integer)
        if search.isdigit():
            query = query.filter(
                or_(
                    Delivery.id == int(search),
                    Delivery.cargo_name.ilike(search_term),
                    Delivery.sender_name.ilike(search_term),
                    Delivery.receiver_name.ilike(search_term),
                    Delivery.origin_city.ilike(search_term),
                    Delivery.destination_city.ilike(search_term)
                )
            )
        else:
            query = query.filter(
                or_(
                    Delivery.cargo_name.ilike(search_term),
                    Delivery.sender_name.ilike(search_term),
                    Delivery.receiver_name.ilike(search_term),
                    Delivery.origin_city.ilike(search_term),
                    Delivery.destination_city.ilike(search_term)
                )
            )

    if sort_by:
        column = getattr(Delivery, sort_by, None)
        if column is not None:
            if sort_desc:
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column.asc())
        else:
            query = query.order_by(Delivery.created_at.desc())
    else:
        query = query.order_by(Delivery.created_at.desc())

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


@router.put("/admin/{delivery_id}/status", response_model=DeliveryResponse)
def admin_update_delivery_status(
    delivery_id: int,
    status_data: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Доставку не знайдено")
        
    new_status = status_data.get("status")
    if new_status:
        delivery.status = new_status
        
        # Симулюємо координати та фотозвіти
        start_c = [delivery.origin_lat, delivery.origin_lng]
        end_c = [delivery.destination_lat, delivery.destination_lng]
        
        status_flow = ["Created", "Processing", "In_Transit"]
        if delivery.is_cross_border:
            status_flow.append("Customs")
        status_flow.append("Delivered")
        
        if new_status in status_flow:
            progress = status_flow.index(new_status) / (len(status_flow) - 1)
            delivery.current_lat = start_c[0] + (end_c[0] - start_c[0]) * progress
            delivery.current_lng = start_c[1] + (end_c[1] - start_c[1]) * progress
            
        if new_status == "In_Transit":
            delivery.photo_proof = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80"
        elif new_status == "Customs":
            delivery.photo_proof = "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80"
        elif new_status == "Delivered":
            delivery.photo_proof = "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80"
            
    db.commit()
    db.refresh(delivery)
    return delivery

