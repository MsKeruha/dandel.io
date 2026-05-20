from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

# Схеми для авторизації та користувачів
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    bonuses_balance: float
    loyalty_level: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None


# Схеми для трансакцій бонусів
class BonusTransactionResponse(BaseModel):
    id: int
    amount: float
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


# Схеми для чату підтримки
class ChatMessageBase(BaseModel):
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: int
    user_id: int
    sender_type: str  # customer, support, system
    created_at: datetime

    class Config:
        from_attributes = True


# Схеми для розрахунку доставки (МКВ / SAW)
class DeliveryCalculateRequest(BaseModel):
    origin_city: str
    destination_city: str
    cargo_type: str  # Стандартний, Крихкий, Терморежим, Великогабаритний
    weight: float = Field(..., gt=0)
    declared_value: float = Field(..., ge=0)
    is_cross_border: bool = False
    
    # Пріоритети критеріїв для SAW (від 0 до 1)
    price_weight: float = Field(0.25, ge=0, le=1)
    time_weight: float = Field(0.25, ge=0, le=1)
    safety_weight: float = Field(0.25, ge=0, le=1)
    eco_weight: float = Field(0.25, ge=0, le=1)

class ScenarioDetails(BaseModel):
    scenario: str  # Експрес, Економ, Безпечний
    price: float
    duration_hours: float
    safety_score: float
    co2_footprint: float
    escort_available: bool
    description: str
    route_points: List[List[float]]  # Список координат [[lat, lng], ...]
    saw_score: float  # підрахована оцінка за алгоритмом SAW (0-1)

class DeliveryCalculateResponse(BaseModel):
    origin: str
    destination: str
    scenarios: List[ScenarioDetails]
    recommended_scenario: str


# Схеми для оформлення доставки
class DeliveryCreate(BaseModel):
    cargo_name: str
    cargo_type: str
    weight: float
    declared_value: float
    is_cross_border: bool
    origin_city: str
    destination_city: str
    sender_name: str
    receiver_name: str
    receiver_phone: str
    scenario: str  # Експрес, Економ, Безпечний
    escort_requested: bool = False
    use_bonuses: bool = False  # чи списувати доступні бонуси користувача


class DeliveryResponse(BaseModel):
    id: int
    sender_id: int
    cargo_name: str
    cargo_type: str
    weight: float
    declared_value: float
    is_cross_border: bool
    origin_city: str
    destination_city: str
    sender_name: str
    receiver_name: str
    receiver_phone: str
    scenario: str
    escort_requested: bool
    photo_proof: Optional[str] = None
    status: str
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    price: float
    duration_hours: float
    safety_score: float
    co2_footprint: float
    bonuses_spent: float
    bonuses_earned: float
    created_at: datetime

    class Config:
        from_attributes = True


# Схеми для рівнів лояльності
class LoyaltyLevelResponse(BaseModel):
    id: int
    name: str
    min_bonuses: float
    discount_percentage: float
    description: Optional[str] = None

    class Config:
        from_attributes = True

# Схеми для автопарку (Fleet Management)
class VehicleBase(BaseModel):
    plate: str
    model: str
    type: str
    capacity_kg: float
    status: str = "Available"

class VehicleCreate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    last_updated: datetime

    class Config:
        from_attributes = True

# Схеми для геокодування
class GeocodeResult(BaseModel):
    name: str
    country: str
    state: Optional[str] = None
    lat: float
    lon: float
