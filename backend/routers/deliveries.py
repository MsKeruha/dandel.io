import math
import random
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Delivery, BonusTransaction
from schemas import DeliveryCalculateRequest, DeliveryCalculateResponse, DeliveryCreate, DeliveryResponse, ScenarioDetails
from routers.auth import get_current_user

router = APIRouter(
    prefix="/api/deliveries",
    tags=["Deliveries & Calculations"]
)

# Координати основних міст для розрахунків маршрутів
CITIES_COORDS: Dict[str, List[float]] = {
    "Київ": [50.4501, 30.5234],
    "Львів": [49.8397, 24.0297],
    "Одеса": [46.4825, 30.7233],
    "Харків": [49.9935, 36.2304],
    "Дніпро": [48.4647, 35.0462],
    "Варшава": [52.2297, 21.0122],
    "Берлін": [52.5200, 13.4050],
    "Прага": [50.0755, 14.4378]
}

# Допоміжна функція для розрахунку відстані (формула Гаверсинуса)
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Радіус Землі в км
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Допоміжна функція для генерації проміжних точок маршруту
def generate_route_points(origin: str, dest: str, scenario: str) -> List[List[float]]:
    start = CITIES_COORDS.get(origin, [50.45, 30.52])
    end = CITIES_COORDS.get(dest, [49.83, 24.02])
    
    points = [start]
    
    if scenario == "Економ":
        # Проходить через транзитні сортувальні центри (наприклад, Хмельницький або Полтава)
        mid_lat = (start[0] + end[0]) / 2 + 0.4
        mid_lng = (start[1] + end[1]) / 2 - 0.5
        points.append([mid_lat, mid_lng])
    elif scenario == "Безпечний":
        # Обходить військові ризики зі сторони безпечних західних чи південних трас
        mid_lat = (start[0] + end[0]) / 2 - 0.3
        mid_lng = (start[1] + end[1]) / 2 + 0.3
        # Додаткові точки перевірки
        points.append([mid_lat - 0.1, mid_lng + 0.1])
        points.append([mid_lat + 0.2, mid_lng - 0.2])
    else:
        # Експрес - пряма лінія з легкою дугою
        mid_lat = (start[0] + end[0]) / 2 + 0.1
        mid_lng = (start[1] + end[1]) / 2 + 0.1
        points.append([mid_lat, mid_lng])
        
    points.append(end)
    return points


@router.post("/calculate", response_model=DeliveryCalculateResponse)
def calculate_options(req: DeliveryCalculateRequest):
    # Валідація міст
    if req.origin_city not in CITIES_COORDS or req.destination_city not in CITIES_COORDS:
        raise HTTPException(
            status_code=400,
            detail=f"Підтримуються тільки наступні міста: {', '.join(CITIES_COORDS.keys())}"
        )
        
    start_coords = CITIES_COORDS[req.origin_city]
    end_coords = CITIES_COORDS[req.destination_city]
    
    distance = calculate_distance(start_coords[0], start_coords[1], end_coords[0], end_coords[1])
    if distance < 10.0:
        raise HTTPException(status_code=400, detail="Місто відправлення та призначення не можуть збігатися")

    # 1. Розрахунок параметрів для 3 сценаріїв
    
    # ⚡ Експрес (Літак + кур'єр)
    express_price = 500.0 + (distance * 18.0) + (req.weight * 40.0) + (req.declared_value * 0.01)
    express_time = max(3.0, distance / 85.0)  # літак + швидка логістика
    express_safety = 8.5
    express_eco = distance * 0.42 + (req.weight * 0.15)  # високий вуглецевий слід
    
    # 🌱 Економ (Збірний вантаж)
    econ_price = 150.0 + (distance * 4.5) + (req.weight * 12.0) + (req.declared_value * 0.005)
    econ_time = max(18.0, distance / 40.0) + 12.0  # збірні склади
    econ_safety = 7.0
    econ_eco = distance * 0.11 + (req.weight * 0.03)  # екологічно
    
    # 🛡️ Безпечний (Обхід зон ризику, спеціальний моніторинг)
    safe_price = 300.0 + (distance * 10.0) + (req.weight * 22.0) + (req.declared_value * 0.008)
    safe_time = max(8.0, distance / 55.0) + 2.0  # додатковий час на чекпоінти
    safe_safety = 9.8  # Оптимальний безпечний маршрут
    safe_eco = distance * 0.21 + (req.weight * 0.07)  # помірні викиди

    # Формуємо сирі дані для нормалізації
    scenarios_raw = {
        "Експрес": {
            "price": express_price,
            "time": express_time,
            "safety": express_safety,
            "eco": express_eco,
            "escort_available": False,
            "description": "Швидка кур'єрська доставка прямим авіа/авто сполученням."
        },
        "Економ": {
            "price": econ_price,
            "time": econ_time,
            "safety": econ_safety,
            "eco": econ_eco,
            "escort_available": False,
            "description": "Вигідна доставка консолідованого вантажу через мережу складів."
        },
        "Безпечний": {
            "price": safe_price,
            "time": safe_time,
            "safety": safe_safety,
            "eco": safe_eco,
            "escort_available": True,
            "description": "Маршрут сплановано в обхід військових ризиків. Додано фотоконтроль на ключових вузлах."
        }
    }

    # 2. Алгоритм SAW (Simple Additive Weighting) - Мультикритеріальна оптимізація
    # Для SAW потрібні нормалізовані значення:
    # - Ціна, Час, Екологічність мінімізуються (менше = краще) -> Min/Value
    # - Безпека максимізується (більше = краще) -> Value/Max
    
    min_price = min(s["price"] for s in scenarios_raw.values())
    min_time = min(s["time"] for s in scenarios_raw.values())
    min_eco = min(s["eco"] for s in scenarios_raw.values())
    max_safety = max(s["safety"] for s in scenarios_raw.values())
    
    # Сума ваг повинна дорівнювати 1
    w_sum = req.price_weight + req.time_weight + req.safety_weight + req.eco_weight
    w_p = req.price_weight / w_sum if w_sum > 0 else 0.25
    w_t = req.time_weight / w_sum if w_sum > 0 else 0.25
    w_s = req.safety_weight / w_sum if w_sum > 0 else 0.25
    w_e = req.eco_weight / w_sum if w_sum > 0 else 0.25

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
        
        route_points = generate_route_points(req.origin_city, req.destination_city, name)
        
        calculated_scenarios.append(ScenarioDetails(
            scenario=name,
            price=round(data["price"], 2),
            duration_hours=round(data["time"], 1),
            safety_score=round(data["safety"], 1),
            co2_footprint=round(data["eco"], 2),
            escort_available=data["escort_available"],
            description=data["description"],
            route_points=route_points,
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


@router.post("/create", response_model=DeliveryResponse)
def create_delivery(
    order_in: DeliveryCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Повторно розраховуємо базові показники для безпеки бэкенду
    if order_in.origin_city not in CITIES_COORDS or order_in.destination_city not in CITIES_COORDS:
        raise HTTPException(status_code=400, detail="Некоректні міста відправлення/призначення")
        
    start_coords = CITIES_COORDS[order_in.origin_city]
    end_coords = CITIES_COORDS[order_in.destination_city]
    distance = calculate_distance(start_coords[0], start_coords[1], end_coords[0], end_coords[1])

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

    # Початкові координати на карті для руху
    start_coords = CITIES_COORDS[order_in.origin_city]

    # Створюємо саму доставку
    new_delivery = Delivery(
        sender_id=current_user.id,
        cargo_name=order_in.cargo_name,
        cargo_type=order_in.cargo_type,
        weight=order_in.weight,
        declared_value=order_in.declared_value,
        is_cross_border=order_in.is_cross_border,
        origin_city=order_in.origin_city,
        destination_city=order_in.destination_city,
        sender_name=order_in.sender_name,
        receiver_name=order_in.receiver_name,
        receiver_phone=order_in.receiver_phone,
        scenario=order_in.scenario,
        escort_requested=order_in.escort_requested,
        status="Created",
        current_lat=start_coords[0],
        current_lng=start_coords[1],
        price=round(final_price, 2),
        duration_hours=round(time_h, 1),
        safety_score=safety,
        co2_footprint=round(co2, 2),
        bonuses_spent=round(bonuses_to_spend, 2),
        bonuses_earned=round(bonuses_earned, 2)
    )

    db.add(new_delivery)
    db.commit()
    db.refresh(new_delivery)
    
    # Пов'язуємо трансакції з доставкою
    tx_earn.delivery_id = new_delivery.id
    if bonuses_to_spend > 0:
        tx.delivery_id = new_delivery.id
    db.commit()

    return new_delivery


@router.get("/my", response_model=List[DeliveryResponse])
def get_my_deliveries(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
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
        
    start_c = CITIES_COORDS[delivery.origin_city]
    end_c = CITIES_COORDS[delivery.destination_city]

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
    return delivery


@router.get("/admin/all", response_model=List[DeliveryResponse])
def admin_get_all_deliveries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Доступ заборонено")
    return db.query(Delivery).order_by(Delivery.created_at.desc()).all()


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
        start_c = CITIES_COORDS[delivery.origin_city]
        end_c = CITIES_COORDS[delivery.destination_city]
        
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

