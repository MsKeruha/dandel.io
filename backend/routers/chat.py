import asyncio
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, ChatMessage
from schemas import ChatMessageCreate, ChatMessageResponse
from routers.auth import get_current_user

router = APIRouter(
    prefix="/api/chat",
    tags=["Support Chat"]
)

@router.get("/messages", response_model=List[ChatMessageResponse])
def get_chat_messages(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Отримуємо всі повідомлення поточного користувача
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    # Якщо чат порожній, додаємо привітальне повідомлення від dandel.io
    if not messages:
        welcome_msg = ChatMessage(
            user_id=current_user.id,
            sender_type="support",
            content=f"Вітаємо у dandel.io, {current_user.full_name}! 🌾 Я твій персональний логістичний помічник. Допомогти тобі розрахувати найкращий маршрут, розповісти про охорону вантажу під час війни чи підказати щодо митних документів для закордонного рейсу?"
        )
        db.add(welcome_msg)
        db.commit()
        db.refresh(welcome_msg)
        messages = [welcome_msg]
        
    return messages


@router.post("/messages", response_model=ChatMessageResponse)
def send_chat_message(
    message_in: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Зберігаємо повідомлення користувача
    user_msg = ChatMessage(
        user_id=current_user.id,
        sender_type="customer",
        content=message_in.content
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)
    
    # 2. Розумне автореагування (AI Triage)
    text = message_in.content.lower()
    reply_content = ""
    
    if "цін" in text or "вартіст" in text or "дорого" in text or "дешев" in text or "рахун" in text:
        reply_content = "Розрахувати точну вартість доставки можна за допомогою нашого інтерактивного калькулятора! Завдяки науковому алгоритму SAW, система підбере оптимальний варіант (Економ, Експрес чи Безпечний) на основі ваших пріоритетів. 📊"
    elif "безпек" in text or "охорон" in text or "супрові" in text or "війн" in text or "ризик" in text:
        reply_content = "У dandel.io ми надзвичайно серйозно ставимося до безпеки. Сценарій 'Безпечний Шлях' прокладає маршрут в обхід зон бойових дій та небезпечних регіонів України. Також ви можете поставити галочку на 'Збройний супровід' — і наш партнер (охоронна компанія) супроводжуватиме ваш вантаж до місця призначення! 🛡️"
    elif "бонус" in text or "акці" or "знижк" in text or "рівен" in text or "лояльн" in text:
        reply_content = "У нас діє унікальна бонусна система! За кожну доставку ви отримуєте 5% кешбеку в бонусах (1 бонус = 1 грн). Бонуси накопичуються, підвищують ваш статус лояльності від 'Насіння' 🌱 до 'Золотої кульбаби' 🌼 і ними можна оплатити до 50% вартості наступних замовлень!"
    elif "польщ" in text or "кордон" in text or "німеччин" in text or "чехі" in text or "за кордон" in text:
        reply_content = "Ми здійснюємо як внутрішні перевезення по Україні, так і транскордонні рейси до Польщі, Німеччини та Чехії на власних автомобілях. Наш сервіс допомагає автоматично згенерувати супровідні митні документи при виборі закордонного напрямку! ✈️"
    elif "машин" in text or "парк" in text or "авто" in text:
        reply_content = "dandel.io здійснює доставку виключно власним автопарком та перевіреними водіями. У нас є легкі швидкісні мінівени для експрес-доставки та важкі тентовані вантажівки для збірних економ-вантажів. Всі машини обладнані GPS-трекерами. 🚚"
    else:
        reply_content = "Дякую за повідомлення! Насіннячко вашого питання вже передано нашій команді підтримки. Оператор відповість вам протягом кількох хвилин. Поки ви чекаєте, рекомендуємо скористатися нашим МКВ калькулятором для підбору найкращої доставки! 🌾"

    support_msg = ChatMessage(
        user_id=current_user.id,
        sender_type="support",
        content=reply_content
    )
    db.add(support_msg)
    db.commit()
    
    return user_msg
