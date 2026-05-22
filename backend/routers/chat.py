import asyncio
from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User, ChatMessage
from schemas import ChatMessageCreate, ChatMessageResponse
from routers.auth import get_current_user
from fastapi import HTTPException

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
    text = message_in.content.strip()
    reply_content = ""
    
    preset_answers = {
        "Як працює безпечний тариф?": "У dandel.io ми надзвичайно серйозно ставимося до безпеки. Сценарій 'Безпечний Шлях' прокладає маршрут в обхід зон бойових дій та небезпечних регіонів України. Також ви можете поставити галочку на 'Збройний супровід' — і наш партнер (охоронна компанія) супроводжуватиме ваш вантаж до місця призначення! 🛡️",
        "Як списати бонуси кульбаби?": "У нас діє унікальна бонусна система! За кожну доставку ви отримуєте 5% кешбеку в бонусах (1 бонус = 1 грн). Бонуси накопичуються, підвищують ваш статус лояльності від 'Насіння' 🌱 до 'Золотої кульбаби' 🌼 і ними можна оплатити до 50% вартості наступних замовлень!",
        "Доставка за кордон (Польща/Німеччина)": "Ми здійснюємо як внутрішні перевезення по Україні, так і транскордонні рейси до Польщі, Німеччини та Чехії на власних автомобілях. Наш сервіс допомагає автоматично згенерувати супровідні митні документи при виборі закордонного напрямку! ✈️",
        "Які машини є у вашому автопарку?": "dandel.io здійснює доставку виключно власним автопарком та перевіреними водіями. У нас є легкі швидкісні мінівени для експрес-доставки та важкі тентовані вантажівки для збірних економ-вантажів. Всі машини обладнані GPS-трекерами. 🚚"
    }
    
    if text in preset_answers:
        reply_content = preset_answers[text]
    else:
        # Check if we should auto-reply or just wait for operator
        # For a simple implementation, if there is a pending operator request, don't spam.
        # Let's just always send "connecting" for any non-preset text for now, but we don't want to spam it if they send 5 messages.
        # Actually, let's just send the connection message once.
        last_support_msgs = db.query(ChatMessage).filter(
            ChatMessage.user_id == current_user.id,
            ChatMessage.sender_type == "support"
        ).order_by(ChatMessage.created_at.desc()).limit(1).all()
        
        if last_support_msgs and "Підключаю оператора" in last_support_msgs[0].content:
            # Don't send another auto-reply if we already said we are connecting an operator
            return user_msg
            
        reply_content = "Підключаю оператора. Будь ласка, зачекайте хвилину, зараз вам дадуть відповідь..."

    support_msg = ChatMessage(
        user_id=current_user.id,
        sender_type="support",
        content=reply_content
    )
    db.add(support_msg)
    db.commit()
    
    return user_msg

class AdminMessageCreate(BaseModel):
    user_id: int
    content: str

@router.get("/admin/chats")
def admin_get_chats(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Отримати список всіх унікальних користувачів, які писали в чат."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    users_with_chats = db.query(User).join(ChatMessage, User.id == ChatMessage.user_id).distinct().all()
    
    chats = []
    for u in users_with_chats:
        # Отримуємо останнє повідомлення клієнта для відображення
        last_msg = db.query(ChatMessage).filter(
            ChatMessage.user_id == u.id, 
            ChatMessage.sender_type == "customer"
        ).order_by(ChatMessage.created_at.desc()).first()
        
        # Перевіряємо чи є непрочитані повідомлення від клієнта
        unread_count = db.query(ChatMessage).filter(
            ChatMessage.user_id == u.id,
            ChatMessage.sender_type == "customer",
            ChatMessage.is_read == False
        ).count()
        
        chats.append({
            "user_id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "last_message": last_msg.content if last_msg else "",
            "last_message_date": last_msg.created_at if last_msg else None,
            "unread": unread_count > 0,
            "is_resolved": last_msg.is_resolved if last_msg else False
        })
        
    chats.sort(key=lambda x: x["last_message_date"], reverse=True)
    return chats

@router.get("/admin/messages/{user_id}", response_model=List[ChatMessageResponse])
def admin_get_user_messages(
    user_id: int,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    # Відмічаємо повідомлення клієнта як прочитані
    unread_messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.sender_type == "customer",
        ChatMessage.is_read == False
    ).all()
    
    if unread_messages:
        for msg in unread_messages:
            msg.is_read = True
        db.commit()
    
    return messages

@router.post("/admin/messages", response_model=ChatMessageResponse)
def admin_send_message(
    message_in: AdminMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    support_msg = ChatMessage(
        user_id=message_in.user_id,
        sender_type="support",
        content=message_in.content
    )
    db.add(support_msg)
    db.commit()
    db.refresh(support_msg)
    
    return support_msg

@router.put("/admin/messages/{user_id}/resolve")
def admin_resolve_chat(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Закрити чат (вирішити питання) шляхом маркування історії як вирішеної."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db.query(ChatMessage).filter(ChatMessage.user_id == user_id).update({"is_resolved": True})
    db.commit()
    return {"status": "success", "message": "Chat resolved"}
