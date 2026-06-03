import pytest
from fastapi import status
import models

def test_register_success(client, db_session):
    user_data = {
        "email": "student@dandel.io",
        "password": "securepassword123",
        "full_name": "Іван Тестовий"
    }
    response = client.post("/api/auth/register", json=user_data)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    # Проверяем, что начислено 100 приветственных бонусов
    assert data["bonuses_balance"] == 100.0
    
    # Проверяем в базе данных
    user = db_session.query(models.User).filter(models.User.email == user_data["email"]).first()
    assert user is not None
    assert user.loyalty_level == "Насіння"


def test_register_duplicate_email(client):
    user_data = {
        "email": "duplicate@dandel.io",
        "password": "password123",
        "full_name": "Перший Користувач"
    }
    
    # Первая регистрация
    response1 = client.post("/api/auth/register", json=user_data)
    assert response1.status_code == status.HTTP_201_CREATED
    
    # Повторная регистрация с тем же email
    response2 = client.post("/api/auth/register", json=user_data)
    assert response2.status_code == status.HTTP_400_BAD_REQUEST
    assert "вже зареєстрований" in response2.json()["detail"]


def test_login_success(client):
    user_data = {
        "email": "login_test@dandel.io",
        "password": "correct_password",
        "full_name": "Петро Логін"
    }
    # Регистрируем
    client.post("/api/auth/register", json=user_data)
    
    # Логинимся
    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }
    response = client.post("/api/auth/login", json=login_data)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == user_data["email"]


def test_login_wrong_password(client):
    user_data = {
        "email": "wrong_pass@dandel.io",
        "password": "correct_password",
        "full_name": "Дмитро Пароль"
    }
    client.post("/api/auth/register", json=user_data)
    
    # Вход с неправильным паролем
    login_data = {
        "email": user_data["email"],
        "password": "wrong_password"
    }
    response = client.post("/api/auth/login", json=login_data)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Неправильний email або пароль" in response.json()["detail"]


def test_get_current_user_unauthorized(client):
    # Попытка сделать запрос к защищенному эндпоинту "my deliveries" без авторизации
    response = client.get("/api/deliveries/my")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
