import pytest
import os
import json
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Добавляем корневой каталог в пути импорта, чтобы pytest видел модули
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from main import app
import models
from auth_utils import get_password_hash

# Используем SQLite в памяти для тестов
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Фикстура для создания структуры базы данных и наполнения базовыми справочниками
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Создаем таблицы
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        # 1. Заполняем уровни лояльности
        levels = [
            models.LoyaltyLevel(name="Насіння", min_bonuses=0.0, discount_percentage=5.0, description="Стартовый уровень"),
            models.LoyaltyLevel(name="Парашутик", min_bonuses=100.0, discount_percentage=7.0, description="Второй уровень"),
            models.LoyaltyLevel(name="Суцвіття", min_bonuses=500.0, discount_percentage=10.0, description="Третий уровень"),
            models.LoyaltyLevel(name="Золота кульбаба", min_bonuses=1500.0, discount_percentage=15.0, description="Максимальный уровень")
        ]
        db.add_all(levels)
        
        # 2. Заполняем дефолтную доступную машину
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
        
        # 3. Заполняем дефолтного водителя
        driver = models.User(
            email="driver@dandel.io",
            full_name="Андрій Колісник",
            hashed_password=get_password_hash("driverpass123"),
            role="driver",
            phone="+380671112233",
            bonuses_balance=0.0
        )
        db.add(driver)
        
        # 4. Заполняем тестовые небезпечні зони
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
    
    # Очищаем таблицы после завершения сессии
    Base.metadata.drop_all(bind=engine)


# Фикстура для изолированной сессии базы данных на каждый тест
@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


# Фикстура для TestClient с переопределенной зависимостью БД
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


# Автоматический мок для сетевых OSRM-запросов во время тестов
@pytest.fixture(scope="session", autouse=True)
def mock_osrm():
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_response = MagicMock()
        # Возвращаем симулированный ответ с расстоянием 540км и длительностью 6 часов (21600 секунд)
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
