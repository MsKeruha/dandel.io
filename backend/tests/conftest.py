import pytest
import os
import json
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Додаємо кореневу директорію до шляхів імпорту, щоб pytest бачив модулі
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from main import app
import models
from auth_utils import get_password_hash

# Використовуємо SQLite в пам'яті для тестів
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Фікстура для створення структури бази даних та наповнення базовими довідниками
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Створюємо таблиці
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        # 1. Заповнюємо рівні лояльності
        levels = [
            models.LoyaltyLevel(name="Насіння", min_bonuses=0.0, discount_percentage=5.0, description="Стартовий рівень"),
            models.LoyaltyLevel(name="Парашутик", min_bonuses=100.0, discount_percentage=7.0, description="Другий рівень"),
            models.LoyaltyLevel(name="Суцвіття", min_bonuses=500.0, discount_percentage=10.0, description="Третій рівень"),
            models.LoyaltyLevel(name="Золота кульбаба", min_bonuses=1500.0, discount_percentage=15.0, description="Максимальний рівень")
        ]
        db.add_all(levels)
        
        # 2. Заповнюємо дефолтну доступну машину
        vehicle = models.Vehicle(
            plate="AA 0001 AA",
            model="Mercedes Sprinter",
            type="Міні-вен",
            capacity_kg=1500.0,
            status="Available",
            current_lat=50.4501,
            current_lng=30.5234
        )
        db.add(vehicle)
        
        # 3. Заповнюємо дефолтного водія
        driver = models.User(
            email="driver@dandel.io",
            full_name="Андрій Колісник",
            hashed_password=get_password_hash("driverpass123"),
            role="driver",
            phone="+380671112233",
            bonuses_balance=0.0
        )
        db.add(driver)
        
        # 4. Заповнюємо тестові небезпечні зони
        zone = models.RiskZone(
            name="Зона ризику",
            lat=48.6,
            lng=36.8,
            radius_km=50.0,
            is_active=True
        )
        db.add(zone)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
        
    yield
    
    # Очищаємо таблиці після завершення сесії
    Base.metadata.drop_all(bind=engine)


# Фікстура для ізольованої сесії бази даних на кожен тест
@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


# Фікстура для TestClient з перевизначеною залежністю БД
@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)


# Автоматичний мок для мережевих OSRM-запитів під час тестів
@pytest.fixture(scope="session", autouse=True)
def mock_osrm():
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_response = MagicMock()
        # Повертаємо симульовану відповідь із відстанню 540км та тривалістю 6 годин (21600 секунд)
        mock_response.read.return_value = json.dumps({
            "routes": [
                {
                    "geometry": {
                        "coordinates": [[30.5234, 50.4501], [24.0297, 49.8397]]
                    },
                    "distance": 540000.0,  # в метрах (540 км)
                    "duration": 21600.0    # в секундах (6 часов)
                }
            ]
        }).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response
        yield mock_urlopen
