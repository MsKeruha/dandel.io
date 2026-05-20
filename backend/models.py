import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base

class LoyaltyLevel(Base):
    __tablename__ = "loyalty_levels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    min_bonuses = Column(Float, nullable=False, default=0.0)  # мін. накопичених бонусів для переходу
    discount_percentage = Column(Float, nullable=False, default=0.0)  # % знижки/кешбеку
    description = Column(String, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="customer")  # customer, admin, driver
    bonuses_balance = Column(Float, default=0.0)
    loyalty_level_id = Column(Integer, ForeignKey("loyalty_levels.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Зв'язки
    loyalty_level_obj = relationship("LoyaltyLevel")
    deliveries = relationship("Delivery", back_populates="sender", cascade="all, delete-orphan")
    bonus_transactions = relationship("BonusTransaction", back_populates="user", cascade="all, delete-orphan")

    @property
    def loyalty_level(self) -> str:
        return self.loyalty_level_obj.name if self.loyalty_level_obj else "Насіння"

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    cargo_name = Column(String, nullable=False)
    cargo_type = Column(String, nullable=False)  # Стандартний, Крихкий, Терморежим, Великогабаритний
    weight = Column(Float, nullable=False)  # в кг
    declared_value = Column(Float, default=0.0)  # оголошена вартість в грн
    is_cross_border = Column(Boolean, default=False)
    
    origin_city = Column(String, nullable=False)
    destination_city = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    receiver_name = Column(String, nullable=False)
    receiver_phone = Column(String, nullable=False)
    
    scenario = Column(String, nullable=False)  # Експрес (Швидко), Економ (Дешево), Безпечний
    escort_requested = Column(Boolean, default=False)  # супровід охоронною компанією
    photo_proof = Column(String, nullable=True)  # лінк на фото контролю
    
    status = Column(String, default="Created")  # Створено, В дорозі, Митниця, Доставлено, Скасовано
    current_lat = Column(Float, nullable=True)  # поточна широта
    current_lng = Column(Float, nullable=True)  # поточна довгота
    
    price = Column(Float, nullable=False)  # ціна доставки в грн
    duration_hours = Column(Float, nullable=False)  # час доставки в годинах
    safety_score = Column(Float, nullable=False)  # коефіцієнт безпеки (0-10)
    co2_footprint = Column(Float, nullable=False)  # викиди CO2 в кг
    
    bonuses_spent = Column(Float, default=0.0)
    bonuses_earned = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Зв'язки
    sender = relationship("User", back_populates="deliveries")
    bonus_transactions = relationship("BonusTransaction", back_populates="delivery")

class BonusTransaction(Base):
    __tablename__ = "bonus_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True)
    amount = Column(Float, nullable=False)  # позитивні (нарахування), негативні (списання)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Зв'язки
    user = relationship("User", back_populates="bonus_transactions")
    delivery = relationship("Delivery", back_populates="bonus_transactions")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_type = Column(String, nullable=False)  # customer, support, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String, unique=True, index=True, nullable=False)
    model = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Фура, Рефрижератор, Міні-вен, Електро-трак
    capacity_kg = Column(Float, nullable=False)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    status = Column(String, default="Available")  # Available, In_Transit, Maintenance, Offline
    
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
