import pytest
from fastapi import status
import models

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ok"
    assert response.json()["app"] == "dandel.io"


def test_get_public_stats(client):
    response = client.get("/api/stats")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "vehicle_count" in data
    assert "on_time_percentage" in data
    assert "cashback_percentage" in data


def test_admin_stats_success(client, db_session):
    # Регистрируем обычного пользователя
    user_data = {
        "email": "admin_test@dandel.io",
        "password": "adminpassword123",
        "full_name": "Адміністратор Тест"
    }
    client.post("/api/auth/register", json=user_data)
    
    # Меняем роль в базе данных на admin
    user = db_session.query(models.User).filter(models.User.email == user_data["email"]).first()
    user.role = "admin"
    db_session.commit()
    
    # Добавим для теста одну доставку в базу данных
    delivery = models.Delivery(
        sender_id=user.id,
        cargo_name="Вантаж для статистики",
        cargo_type="Стандартний",
        weight=10.0,
        origin_city="Київ",
        destination_city="Львів",
        sender_name="Адміністратор Тест",
        receiver_name="Отримувач",
        receiver_phone="+380000000000",
        scenario="Економ",
        status="In_Transit",
        price=1000.0,
        duration_hours=6.0,
        safety_score=8.0,
        co2_footprint=2.0,  # 10.0 * 0.42 - 2.0 = 2.2 кг CO2 спасенного
        bonuses_earned=50.0
    )
    db_session.add(delivery)
    db_session.commit()
    
    # Авторизуемся
    login_response = client.post("/api/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"]
    })
    token = login_response.json()["access_token"]
    
    # Делаем запрос к админской статистике
    response = client.get("/api/deliveries/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["totalDeliveries"] == 1
    assert data["activeDeliveries"] == 1
    assert data["totalBonusesPaid"] == 50.0
    assert data["totalCo2Saved"] == 2.2



def test_admin_stats_forbidden(client):
    # Регистрируем обычного пользователя (роль по умолчанию 'customer')
    user_data = {
        "email": "customer_test@dandel.io",
        "password": "password123",
        "full_name": "Звичайний Клієнт"
    }
    client.post("/api/auth/register", json=user_data)
    
    # Авторизуемся
    login_response = client.post("/api/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"]
    })
    token = login_response.json()["access_token"]
    
    # Пытаемся зайти в админку
    response = client.get("/api/deliveries/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Доступ заборонено" in response.json()["detail"]
