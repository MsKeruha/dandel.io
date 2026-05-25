from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

# Схеми для авторизації та користувачів
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)

class UserResponse(UserBase):
    id: int
    role: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    address: Optional[str] = None
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
    is_read: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True


# Схеми для розрахунку доставки (МКВ / SAW)
class DeliveryCalculateRequest(BaseModel):
    origin_city: str
    destination_city: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
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
    cargo_name: str = Field(..., max_length=100)
    cargo_type: str
    weight: float
    declared_value: float
    is_cross_border: bool
    origin_city: str
    destination_city: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    sender_name: str = Field(..., max_length=100)
    sender_address: str
    receiver_name: str = Field(..., max_length=100)
    receiver_phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    receiver_address: str
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
    sender_address: Optional[str] = None
    receiver_name: str
    receiver_phone: str
    receiver_address: Optional[str] = None
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
    route_points: Optional[List[List[float]]] = None
    created_at: datetime
    driver_id: Optional[int] = None

    class Config:
        from_attributes = True

class AdminDeliveryResponse(BaseModel):
    id: int
    sender_id: int
    cargo_name: str
    cargo_type: str
    weight: float
    declared_value: float
    is_cross_border: bool
    origin_city: str
    destination_city: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    sender_name: str
    sender_address: Optional[str] = None
    receiver_name: str
    receiver_phone: str
    receiver_address: Optional[str] = None
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
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None

    class Config:
        from_attributes = True

class DeliveryGuestResponse(BaseModel):
    delivery: DeliveryResponse
    token: Optional[Token] = None
    generated_password: Optional[str] = None


class DriverDeliveryInfo(BaseModel):
    id: int
    cargo_name: str
    origin_city: str
    destination_city: str
    status: str
    
    class Config:
        from_attributes = True

class AdminDriverResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    status: str = "Active"
    active_deliveries: List[DriverDeliveryInfo] = []
    
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

class VehicleDeliveryResponse(BaseModel):
    id: int
    cargo_name: str
    origin_city: str
    destination_city: str
    status: str
    
    class Config:
        from_attributes = True

class VehicleResponse(VehicleBase):
    id: int
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    last_updated: datetime
    active_delivery: Optional[VehicleDeliveryResponse] = None

    class Config:
        from_attributes = True

# Схеми для геокодування
class GeocodeResult(BaseModel):
    name: str
    full_address: Optional[str] = None
    country: str
    state: Optional[str] = None
    lat: float
    lon: float

# Схеми для зон ризику
class RiskZoneResponse(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    radius_km: float
    is_active: bool

    class Config:
        from_attributes = True

from typing import TypeVar, Generic

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    items: List[T]
    page: int
    size: int
    pages: int

