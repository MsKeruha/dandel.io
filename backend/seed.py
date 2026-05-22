import os
import random
import datetime
import argparse
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Додаємо поточний каталог до шляху імпорту
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base
import models
from auth_utils import get_password_hash

load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "dandelion")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Набори реалістичних даних для української логістики
UKRAINIAN_NAMES = [
    "Микола Сидоренко", "Ольга Петренко", "Дмитро Ковальчук", "Анна Шевченко", 
    "Іван Бондаренко", "Марія Мороз", "Сергій Ткаченко", "Юлія Кравченко",
    "Ярослав Лисенко", "Наталія Клименко", "Олександр Мельник", "Тетяна Бойко"
]

CARGO_TEMPLATES = [
    {"name": "Медикаменти та вітаміни", "type": "Терморежим", "weight": 12.5, "value": 15000},
    {"name": "Запчастини для генератора", "type": "Великогабаритний", "weight": 85.0, "value": 45000},
    {"name": "Кришталева люстра", "type": "Крихкий", "weight": 6.2, "value": 8000},
    {"name": "Коробка з книжками", "type": "Стандартний", "weight": 18.0, "value": 2500},
    {"name": "ІТ-обладнання (сервер)", "type": "Крихкий", "weight": 24.5, "value": 120000},
    {"name": "Дитячий візок", "type": "Великогабаритний", "weight": 14.0, "value": 9500},
    {"name": "Теплий одяг та спальники", "type": "Стандартний", "weight": 35.0, "value": 6000},
    {"name": "Документи підписи та печатки", "type": "Стандартний", "weight": 0.8, "value": 1000}
]

CITIES_COORDS = {
    "Київ": [50.4501, 30.5234],
    "Львів": [49.8397, 24.0297],
    "Одеса": [46.4825, 30.7233],
    "Харків": [49.9935, 36.2304],
    "Дніпро": [48.4647, 35.0462],
    "Варшава": [52.2297, 21.0122],
    "Берлін": [52.5200, 13.4050],
    "Прага": [50.0755, 14.4378]
}

PHOTO_PROOFS = [
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",  # склад
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80",  # документи на фоні коробки
    "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80",  # трак на дорозі
    "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80"   # розвантаження
]

CHAT_PRESETS = [
    {"type": "customer", "content": "Доброго дня! Чи можете підказати, коли мій безпечний рейс проїде блокпост біля Житомира?"},
    {"type": "support", "content": "Вітаємо у dandel.io! 🌾 Наш екіпаж супроводу щойно доповів про успішний проїзд контрольного пункту. Все спокійно, рухаємося за графіком!"},
    {"type": "customer", "content": "Чудово, дякую за вашу роботу! А фотозвіт вже завантажився?"},
    {"type": "support", "content": "Так, звісно! Ви можете переглянути актуальне фото з КПП у вашому кабінеті у вкладці трекінгу. 📸"}
]

def get_lerp_coords(start_city, end_city, progress):
    """Лінійна інтерполяція для красивої симуляції поточного положення вантажівки"""
    c1 = CITIES_COORDS.get(start_city, [50.4501, 30.5234])
    c2 = CITIES_COORDS.get(end_city, [49.8397, 24.0297])
    lat = c1[0] + (c2[0] - c1[0]) * progress
    lng = c1[1] + (c2[1] - c1[1]) * progress
    return lat, lng

def seed_data(reset=False):
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    if reset:
        print("🧹 Очищення бази даних (видалення рядків)...")
        db.query(models.ChatMessage).delete()
        db.query(models.BonusTransaction).delete()
        db.query(models.Delivery).delete()
        db.query(models.User).delete()
        db.query(models.LoyaltyLevel).delete()
        db.query(models.RiskZone).delete()
        db.commit()

    if not db.query(models.RiskZone).first():
        print("🌱 Генерація небезпечних зон (RiskZones)...")
        db.add_all([
            models.RiskZone(name="Східний фронт", lat=48.6, lng=36.8, radius_km=150.0),
            models.RiskZone(name="Південний фронт", lat=46.6, lng=32.6, radius_km=120.0),
            models.RiskZone(name="Зона ризику", lat=34.0, lng=44.0, radius_km=50.0)
        ])
        db.commit()

    if not db.query(models.LoyaltyLevel).first():
        print("🌱 Генерація рівнів лояльності (dandel.io)...")
        levels_data = [
            {"name": "Насіння", "min_bonuses": 0.0, "discount": 5.0, "desc": "Стартовий рівень лояльності. Насіннячко вашого логістичного шляху. 🌾"},
            {"name": "Парашутик", "min_bonuses": 100.0, "discount": 7.0, "desc": "Парашутик кульбаби вже підхоплений вітром і летить вперед! 🎈"},
            {"name": "Суцвіття", "min_bonuses": 500.0, "discount": 10.0, "desc": "Яскраве суцвіття нашої співпраці. Максимальна довіра та пріоритет. 🌼"},
            {"name": "Золота кульбаба", "min_bonuses": 1500.0, "discount": 15.0, "desc": "Королівський статус лояльності. Ваша логістика повністю під нашим крилом! 👑"}
        ]
        
        for ld in levels_data:
            lvl = models.LoyaltyLevel(
                name=ld["name"],
                min_bonuses=ld["min_bonuses"],
                discount_percentage=ld["discount"],
                description=ld["desc"]
            )
            db.add(lvl)
        db.commit()
    
    db_levels = {lvl.name: lvl for lvl in db.query(models.LoyaltyLevel).all()}

    if not db.query(models.User).first():
        print("🌱 Генерація користувачів (dandel.io)...")
        
        # 1. Створюємо головного демо-користувача (Константин Кульбаба)
        demo_user = models.User(
            email="test@dandel.io",
            full_name="Костянтин Кульбаба",
            hashed_password=get_password_hash("testpass123"),
            role="customer",
            bonuses_balance=250.0,
            loyalty_level_id=db_levels["Парашутик"].id
        )
        db.add(demo_user)
        
        # 2. Створюємо адміністратора системи
        admin_user = models.User(
            email="admin@dandel.io",
            full_name="Олександр Вітер",
            hashed_password=get_password_hash("adminpass123"),
            role="admin",
            bonuses_balance=0.0,
            loyalty_level_id=db_levels["Золота кульбаба"].id
        )
        db.add(admin_user)

        # 3. Створюємо елітного водія доставки dandel.io
        driver_user = models.User(
            email="driver@dandel.io",
            full_name="Андрій Колісник",
            hashed_password=get_password_hash("driverpass123"),
            role="driver",
            bonuses_balance=0.0,
            loyalty_level_id=db_levels["Насіння"].id
        )
        db.add(driver_user)

        # 4. Створюємо кілька інших випадкових клієнтів
        other_users = []
        for i in range(5):
            name = UKRAINIAN_NAMES[i]
            email = f"user_{random.randint(100, 999)}@dandel.io"
            u = models.User(
                email=email,
                full_name=name,
                hashed_password=get_password_hash("pass123"),
                role="customer",
                bonuses_balance=float(random.randint(10, 150)),
                loyalty_level_id=db_levels[random.choice(["Насіння", "Парашутик", "Суцвіття"])].id
            )
            db.add(u)

        db.commit()
        print("✅ Користувачів успішно додано.")
    else:
        print("⏭️ Користувачі вже існують. Пропуск генерації.")

    if not db.query(models.Vehicle).first():
        print("🚛 Генерація автопарку (141 машина)...")
        vehicles = []
        models_list = ["Mercedes Sprinter", "Renault Master", "Ford Transit", "MAN TGX", "Volvo FH", "Scania R450"]
        types_list = ["Фура", "Рефрижератор", "Міні-вен", "Електро-трак"]
        statuses = ["Available", "In_Transit", "Maintenance", "Offline"]
        
        for i in range(141):
            v_type = random.choice(types_list)
            cap = 1500 if v_type == "Міні-вен" else (5000 if v_type == "Електро-трак" else 20000)
            v = models.Vehicle(
                plate=f"AA{1000 + i:04d}BC",
                model=random.choice(models_list),
                type=v_type,
                capacity_kg=cap + random.randint(-500, 500),
                status=random.choices(statuses, weights=[60, 30, 5, 5])[0]
            )
            vehicles.append(v)
        
        db.add_all(vehicles)
        db.commit()
        print("✅ Автопарк успішно згенеровано.")

    other_users = db.query(models.User).filter(models.User.role == "customer").all()
    demo_user = db.query(models.User).filter_by(email="test@dandel.io").first()
    if not demo_user and other_users:
        demo_user = other_users[0]

    should_seed_deliveries = not db.query(models.Delivery).first() and demo_user
    if should_seed_deliveries:
        print("🚚 Генерація логістичних доставок з мультикритеріальними сценаріями...")
    else:
        print("⏭️ Доставки вже існують. Пропуск генерації.")

    # Створюємо набір фіксованих цікавих доставок для головного демо-користувача
    demo_deliveries_data = [
        {
            "cargo_name": "Подарунковий бокс «Українські традиції»",
            "cargo_type": "Стандартний",
            "weight": 3.5,
            "declared_value": 2500.0,
            "is_cross_border": False,
            "origin_city": "Львів",
            "destination_city": "Київ",
            "sender_name": "Костянтин Кульбаба",
            "receiver_name": "Марія Вітер",
            "receiver_phone": "+380671234567",
            "scenario": "Безпечний",
            "escort_requested": False,
            "status": "In_Transit",
            "progress": 0.65,
            "price": 450.0,
            "duration_hours": 10.0,
            "safety_score": 9.8,
            "co2_footprint": 18.2,
            "bonuses_spent": 50.0,
            "bonuses_earned": 22.5,
            "photo_proof": PHOTO_PROOFS[0]
        },
        {
            "cargo_name": "Серверне обладнання Dell R740",
            "cargo_type": "Крихкий",
            "weight": 28.0,
            "declared_value": 150000.0,
            "is_cross_border": True,
            "origin_city": "Київ",
            "destination_city": "Варшава",
            "sender_name": "Костянтин Кульбаба",
            "receiver_name": "Jan Kowalski",
            "receiver_phone": "+48501234567",
            "scenario": "Безпечний",
            "escort_requested": True, # збройна охорона
            "status": "Processing",
            "progress": 0.1,
            "price": 3200.0,
            "duration_hours": 18.0,
            "safety_score": 10.0, # Охорона дає максимум безпеки!
            "co2_footprint": 95.0,
            "bonuses_spent": 0.0,
            "bonuses_earned": 160.0,
            "photo_proof": None
        },
        {
            "cargo_name": "Екологічні чаї та мед",
            "cargo_type": "Стандартний",
            "weight": 8.0,
            "declared_value": 1200.0,
            "is_cross_border": False,
            "origin_city": "Одеса",
            "destination_city": "Дніпро",
            "sender_name": "Костянтин Кульбаба",
            "receiver_name": "Іван Шевчук",
            "receiver_phone": "+380509876543",
            "scenario": "Економ",
            "escort_requested": False,
            "status": "Delivered",
            "progress": 1.0,
            "price": 180.0,
            "duration_hours": 24.0,
            "safety_score": 7.2,
            "co2_footprint": 4.5, # Дуже екологічний та дешевий
            "bonuses_spent": 0.0,
            "bonuses_earned": 9.0,
            "photo_proof": PHOTO_PROOFS[1]
        }
    ]

    all_seeded_deliveries = []

    # Додаємо демо-доставки
    if should_seed_deliveries:
        for dd in demo_deliveries_data:
            lat, lng = get_lerp_coords(dd["origin_city"], dd["destination_city"], dd["progress"])
            d = models.Delivery(
                sender_id=demo_user.id,
                cargo_name=dd["cargo_name"],
                cargo_type=dd["cargo_type"],
                weight=dd["weight"],
                declared_value=dd["declared_value"],
                is_cross_border=dd["is_cross_border"],
                origin_city=dd["origin_city"],
                destination_city=dd["destination_city"],
                sender_name=dd["sender_name"],
                receiver_name=dd["receiver_name"],
                receiver_phone=dd["receiver_phone"],
                scenario=dd["scenario"],
                escort_requested=dd["escort_requested"],
                status=dd["status"],
                current_lat=lat if dd["status"] in ["In_Transit", "Delivered"] else None,
                current_lng=lng if dd["status"] in ["In_Transit", "Delivered"] else None,
                price=dd["price"],
                duration_hours=dd["duration_hours"],
                safety_score=dd["safety_score"],
                co2_footprint=dd["co2_footprint"],
                bonuses_spent=dd["bonuses_spent"],
                bonuses_earned=dd["bonuses_earned"],
                photo_proof=dd["photo_proof"],
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 10))
            )
            db.add(d)
            db.flush()
            all_seeded_deliveries.append(d)

    # 5. Генеруємо історичні замовлення для інших користувачів
    if should_seed_deliveries:
        for u in other_users:
            for _ in range(random.randint(2, 4)):
                cargo = random.choice(CARGO_TEMPLATES)
                origin = random.choice(list(CITIES_COORDS.keys()))
                dest = random.choice([c for c in list(CITIES_COORDS.keys()) if c != origin])
                scenario = random.choice(["Експрес", "Економ", "Безпечний"])
                status = random.choice(["Delivered", "Cancelled", "In_Transit"])
                
                is_cross = origin in ["Варшава", "Берлін", "Прага"] or dest in ["Варшава", "Берлін", "Прага"]
                escort = scenario == "Безпечний" and random.choice([True, False])
                
                # Розрахунок реалістичних показників
                dist_factor = 250 + random.randint(100, 800)
                price = dist_factor * (1.8 if scenario == "Експрес" else 0.8 if scenario == "Економ" else 1.2)
                if escort:
                    price += 500.0
                
                duration = (dist_factor / 80.0) if scenario == "Експрес" else (dist_factor / 40.0)
                safety = 9.8 if scenario == "Безпечний" else 8.2 if scenario == "Експрес" else 6.5
                if escort:
                    safety = 10.0
                    
                co2 = cargo["weight"] * 0.15 * (dist_factor / 100.0)
                if scenario == "Економ":
                    co2 *= 0.5  # Екологічно збірний вантаж

                progress = 1.0 if status == "Delivered" else 0.45 if status == "In_Transit" else 0.0
                lat, lng = get_lerp_coords(origin, dest, progress)

                d = models.Delivery(
                    sender_id=u.id,
                    cargo_name=cargo["name"],
                    cargo_type=cargo["type"],
                    weight=cargo["weight"],
                    declared_value=cargo["value"],
                    is_cross_border=is_cross,
                    origin_city=origin,
                    destination_city=dest,
                    sender_name=u.full_name,
                    receiver_name=random.choice(UKRAINIAN_NAMES),
                    receiver_phone=f"+380{random.randint(50, 99)}{random.randint(100, 999)}{random.randint(10, 99)}{random.randint(10, 99)}",
                    scenario=scenario,
                    escort_requested=escort,
                    status=status,
                    current_lat=lat if status in ["In_Transit", "Delivered"] else None,
                    current_lng=lng if status in ["In_Transit", "Delivered"] else None,
                    price=round(price, 2),
                    duration_hours=round(duration, 1),
                    safety_score=safety,
                    co2_footprint=round(co2, 2),
                    bonuses_spent=0.0,
                    bonuses_earned=round(price * 0.05, 2),
                    photo_proof=random.choice(PHOTO_PROOFS) if status == "Delivered" else None,
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(5, 45))
                )
                db.add(d)
                db.flush()
                all_seeded_deliveries.append(d)

        db.commit()
        print("✅ Доставки успішно згенеровані.")

    if not db.query(models.BonusTransaction).first() and demo_user:
        print("🌼 Нарахування трансакцій бонусної лояльності...")

        # Додаємо кілька красивих трансакцій для головного користувача
        demo_transactions = [
            {"amount": 100.0, "desc": "Вітальні бонуси при реєстрації на dandel.io 🌱"},
            {"amount": 122.5, "desc": "Нарахування 5% бонусів за успішну доставку збірного вантажу"},
            {"amount": -50.0, "desc": "Списання бонусів при оформленні відправлення коробки в Київ"},
            {"amount": 77.5, "desc": "Нарахування бонусів за екологічний SAW-маршрут"}
        ]

        for tx in demo_transactions:
            t = models.BonusTransaction(
                user_id=demo_user.id,
                amount=tx["amount"],
                description=tx["desc"],
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 15))
            )
            db.add(t)

        # Додаємо бонуси іншим користувачам
        for u in other_users:
            t = models.BonusTransaction(
                user_id=u.id,
                amount=u.bonuses_balance,
                description="Стартовий бонус лояльності",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=20)
            )
            db.add(t)

        db.commit()
        print("✅ Бонусна система заповнена трансакціями.")
    else:
        print("⏭️ Трансакції вже існують. Пропуск генерації.")

    if not db.query(models.ChatMessage).first() and demo_user:
        print("💬 Створення демонстраційного діалогу з логістичним AI-асистентом...")

        # Створюємо діалог для головного демо-користувача
        for i, msg in enumerate(CHAT_PRESETS):
            m = models.ChatMessage(
                user_id=demo_user.id,
                sender_type=msg["type"],
                content=msg["content"],
                created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=15 - i * 2)
            )
            db.add(m)

        db.commit()
        print("✅ Логи повідомлень чату успішно імпортовано.")
    else:
        print("⏭️ Логи чату вже існують. Пропуск генерації.")
    
    print("\n🎉 БАЗУ ДАНИХ DANDEL.IO УСПІШНО ЗАПОВНЕНО ПРЕМІУМ-ДАННИМИ! 🌾")
    print(f"🔑 Демо-акаунт клієнта: test@dandel.io / Пароль: testpass123")
    print(f"🔑 Акаунт адміністратора: admin@dandel.io / Пароль: adminpass123")
    print(f"🔑 Акаунт екіпажу/водія: driver@dandel.io / Пароль: driverpass123")

    db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Очистити таблиці перед початком заповнення")
    args = parser.parse_args()
    seed_data(reset=args.reset)
