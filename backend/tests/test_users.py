import pytest
from fastapi import status
import models

def test_get_me_success(client):
    user_data = {
        "email": "user_me@dandel.io",
        "password": "password123",
        "full_name": "Костянтин Тест"
    }
    client.post("/api/auth/register", json=user_data)
    
    # Авторизуємося
    login_response = client.post("/api/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"]
    })
    token = login_response.json()["access_token"]
    
    response = client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    assert data["bonuses_balance"] == 100.0


def test_update_me_success(client, db_session):
    user_data = {
        "email": "update_me@dandel.io",
        "password": "password123",
        "full_name": "Іван До Оновлення"
    }
    client.post("/api/auth/register", json=user_data)
    
    login_response = client.post("/api/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"]
    })
    token = login_response.json()["access_token"]
    
    update_data = {
        "full_name": "Іван Після Оновлення",
        "phone": "+380501112233",
        "address": "Київ, вул. Шевченка, 10"
    }
    
    response = client.put(
        "/api/users/me",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == update_data["full_name"]
    assert data["phone"] == update_data["phone"]
    assert data["address"] == update_data["address"]
    
    # Перевіряємо в БД напряму
    user = db_session.query(models.User).filter(models.User.email == user_data["email"]).first()
    assert user.full_name == update_data["full_name"]
    assert user.phone == update_data["phone"]
    assert user.address == update_data["address"]


def test_get_bonus_history(client, db_session):
    # Реєструємо користувача
    user_data = {
        "email": "bonus_history@dandel.io",
        "password": "password123",
        "full_name": "Дмитро Бонус"
    }
    client.post("/api/auth/register", json=user_data)
    
    login_response = client.post("/api/auth/login", json={
        "email": user_data["email"],
        "password": user_data["password"]
    })
    token = login_response.json()["access_token"]
    
    # Напряму в БД додаємо транзакцію для тесту
    user = db_session.query(models.User).filter(models.User.email == user_data["email"]).first()
    transaction = models.BonusTransaction(
        user_id=user.id,
        amount=50.0,
        description="Тестове нарахування"
    )
    db_session.add(transaction)
    db_session.commit()
    
    response = client.get("/api/users/me/bonuses", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert len(data) == 1
    assert data[0]["amount"] == 50.0
    assert data[0]["description"] == "Тестове нарахування"


def test_get_loyalty_levels(client):
    # Рівні лояльності доступні без авторизації
    response = client.get("/api/users/loyalty-levels")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # У conftest.py ми додали 4 рівні
    assert len(data) == 4
    names = [level["name"] for level in data]
    assert "Насіння" in names
    assert "Золота кульбаба" in names
