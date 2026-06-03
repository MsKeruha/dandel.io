import pytest
from fastapi import status
import models

def test_calculate_options_success(client):
    calc_data = {
        "origin_city": "Київ",
        "destination_city": "Львів",
        "origin_lat": 50.4501,
        "origin_lng": 30.5234,
        "destination_lat": 49.8397,
        "destination_lng": 24.0297,
        "cargo_type": "Стандартний",
        "weight": 10.0,
        "declared_value": 2000.0,
        "price_weight": 0.4,
        "time_weight": 0.3,
        "safety_weight": 0.2,
        "eco_weight": 0.1
    }
    response = client.post("/api/deliveries/calculate", json=calc_data)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["origin"] == calc_data["origin_city"]
    assert data["destination"] == calc_data["destination_city"]
    assert len(data["scenarios"]) == 3
    
    scenarios = {s["scenario"]: s for s in data["scenarios"]}
    assert "Експрес" in scenarios
    assert "Економ" in scenarios
    assert "Безпечний" in scenarios
    
    # Проверяем, что у каждого сценария есть SAW-оценка
    for name, details in scenarios.items():
        assert "saw_score" in details
        assert details["price"] > 0
        assert details["duration_hours"] > 0
        assert details["safety_score"] > 0
        assert details["co2_footprint"] > 0
        
    assert "recommended_scenario" in data
    assert data["recommended_scenario"] in ["Експрес", "Економ", "Безпечний"]


def test_calculate_options_same_city_error(client):
    calc_data = {
        "origin_city": "Київ",
        "destination_city": "Київ",
        "origin_lat": 50.4501,
        "origin_lng": 30.5234,
        "destination_lat": 50.4501,
        "destination_lng": 30.5234,
        "cargo_type": "Стандартний",
        "weight": 10.0,
        "declared_value": 2000.0,
        "price_weight": 0.25,
        "time_weight": 0.25,
        "safety_weight": 0.25,
        "eco_weight": 0.25
    }
    response = client.post("/api/deliveries/calculate", json=calc_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "не можуть збігатися" in response.json()["detail"]


def test_create_delivery_guest(client, db_session):
    order_data = {
        "cargo_name": "Тестовий ноутбук",
        "cargo_type": "Крихкий",
        "weight": 2.5,
        "declared_value": 35000.0,
        "is_cross_border": False,
        "origin_city": "Київ",
        "destination_city": "Львів",
        "origin_lat": 50.4501,
        "origin_lng": 30.5234,
        "destination_lat": 49.8397,
        "destination_lng": 24.0297,
        "sender_name": "Іван Гість",
        "receiver_name": "Петро Отримувач",
        "receiver_phone": "+380998887766",
        "sender_address": "вул. Хрещатик, 1",
        "receiver_address": "вул. Городоцька, 10",
        "scenario": "Економ",
        "escort_requested": False,
        "use_bonuses": False
    }
    
    response = client.post("/api/deliveries/create", json=order_data)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "delivery" in data
    assert "token" in data
    assert data["generated_password"] is not None
    
    delivery_data = data["delivery"]
    assert delivery_data["cargo_name"] == order_data["cargo_name"]
    assert delivery_data["status"] == "Created"
    # Для гостя создается пользователь
    assert data["token"]["user"]["email"] == "guest_380998887766@dandel.io"
    
    # Проверяем, что автоматически подобрались машина и водитель из conftest.py
    delivery_db = db_session.query(models.Delivery).filter(models.Delivery.id == delivery_data["id"]).first()
    assert delivery_db.vehicle_id is not None
    assert delivery_db.driver_id is not None


def test_create_delivery_user_with_bonuses(client, db_session):
    # Регистрируем пользователя
    user_data = {
        "email": "loyalty_user@dandel.io",
        "password": "userpass123",
        "full_name": "Олексій Бонус"
    }
    register_response = client.post("/api/auth/register", json=user_data)
    assert register_response.status_code == status.HTTP_201_CREATED
    
    # Авторизуемся
    login_response = client.post("/api/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"]
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # У пользователя 100 приветственных бонусов. Создаем доставку с бонусами.
    order_data = {
        "cargo_name": "Бочки з фарбою",
        "cargo_type": "Стандартний",
        "weight": 50.0,
        "declared_value": 5000.0,
        "is_cross_border": False,
        "origin_city": "Київ",
        "destination_city": "Львів",
        "origin_lat": 50.4501,
        "origin_lng": 30.5234,
        "destination_lat": 49.8397,
        "destination_lng": 24.0297,
        "sender_name": "Олексій Бонус",
        "sender_address": "вул. Хрещатик, 1",
        "receiver_name": "Марина Коваль",
        "receiver_phone": "+380675554433",
        "receiver_address": "вул. Городоцька, 10",
        "scenario": "Економ",
        "escort_requested": False,
        "use_bonuses": True
    }
    
    response = client.post("/api/deliveries/create", json=order_data, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    delivery_data = data["delivery"]
    
    # Проверяем бонусы
    assert delivery_data["bonuses_spent"] == 100.0  # Списали все 100 доступных бонусов
    assert delivery_data["bonuses_earned"] > 0       # Начислили кешбэк
    
    # Проверяем баланс пользователя в БД
    user = db_session.query(models.User).filter(models.User.email == user_data["email"]).first()
    # Баланс должен быть равен: 0 (после списания 100 бонусов) + bonuses_earned (кешбэк)
    assert user.bonuses_balance == delivery_data["bonuses_earned"]
    
    # Должны быть транзакции бонусов
    transactions = db_session.query(models.BonusTransaction).filter(models.BonusTransaction.user_id == user.id).all()
    assert len(transactions) == 2  # -100 списание, +кешбэк начисление (приветственные 100 не создают транзакцию в БД)


def test_simulate_delivery_step(client, db_session):
    # Регистрируем пользователя и создаем доставку
    user_data = {
        "email": "simulate@dandel.io",
        "password": "password123",
        "full_name": "Симулятор"
    }
    client.post("/api/auth/register", json=user_data)
    login_response = client.post("/api/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"]
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    order_data = {
        "cargo_name": "Кришталь",
        "cargo_type": "Крихкий",
        "weight": 5.0,
        "declared_value": 10000.0,
        "is_cross_border": False,
        "origin_city": "Київ",
        "destination_city": "Львів",
        "origin_lat": 50.4501,
        "origin_lng": 30.5234,
        "destination_lat": 49.8397,
        "destination_lng": 24.0297,
        "sender_name": "Симулятор",
        "sender_address": "вул. Хрещатик, 1",
        "receiver_name": "Отримувач",
        "receiver_phone": "+380674443322",
        "receiver_address": "вул. Городоцька, 10",
        "scenario": "Безпечний",
        "escort_requested": False,
        "use_bonuses": False
    }
    
    create_response = client.post("/api/deliveries/create", json=order_data, headers=headers)
    delivery_id = create_response.json()["delivery"]["id"]
    
    # Первая симуляция шага (Created -> Processing)
    sim_response = client.post(f"/api/deliveries/{delivery_id}/simulate-step", headers=headers)
    assert sim_response.status_code == status.HTTP_200_OK
    assert sim_response.json()["status"] == "Processing"
    
    # Вторая симуляция (Processing -> In_Transit)
    sim_response = client.post(f"/api/deliveries/{delivery_id}/simulate-step", headers=headers)
    assert sim_response.json()["status"] == "In_Transit"
    assert sim_response.json()["photo_proof"] is not None
