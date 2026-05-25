import os
import datetime
from celery import Celery
from celery.schedules import crontab
from sqlalchemy.orm import Session
from database import SessionLocal
import models

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery = Celery(
    "dandel_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Налаштування Celery Beat Schedule
celery.conf.beat_schedule = {
    "update-deliveries-statuses-every-minute": {
        "task": "celery_app.update_deliveries_statuses_task",
        "schedule": 60.0,  # кожні 60 секунд
    },
}
celery.conf.timezone = "UTC"

@celery.task
def update_deliveries_statuses_task():
    print("⏳ [Celery] Початок періодичного оновлення статусів доставок...")
    db = SessionLocal()
    try:
        # Отримуємо всі доставки, які не завершені та не скасовані
        deliveries = db.query(models.Delivery).filter(
            models.Delivery.status.notin_(['Delivered', 'Cancelled'])
        ).all()
        
        updated_count = 0
        for deliv in deliveries:
            if not deliv.created_at or not deliv.duration_hours:
                continue
                
            now = datetime.datetime.utcnow()
            # Рахуємо скільки годин пройшло з моменту створення
            elapsed = (now - deliv.created_at.replace(tzinfo=None)).total_seconds() / 3600.0
            total_h = deliv.duration_hours
            
            old_status = deliv.status
            new_status = old_status
            
            if elapsed >= total_h:
                new_status = 'Delivered'
                # Звільняємо автомобіль
                if deliv.vehicle_id:
                    veh = db.query(models.Vehicle).filter(models.Vehicle.id == deliv.vehicle_id).first()
                    if veh:
                        veh.status = 'Available'
            elif elapsed >= total_h * 0.8 and deliv.is_cross_border:
                new_status = 'Customs'
            elif elapsed >= total_h * 0.3:
                new_status = 'In_Transit'
            elif elapsed >= total_h * 0.1:
                new_status = 'Processing'
                
            if new_status != old_status:
                deliv.status = new_status
                # Також оновимо симуляцію координат відповідно до прогресу
                progress = min(1.0, elapsed / total_h)
                start_c = [deliv.origin_lat, deliv.origin_lng]
                end_c = [deliv.destination_lat, deliv.destination_lng]
                deliv.current_lat = start_c[0] + (end_c[0] - start_c[0]) * progress
                deliv.current_lng = start_c[1] + (end_c[1] - start_c[1]) * progress
                

                updated_count += 1
                print(f"📦 [Celery] Доставка #{deliv.id} змінила статус з {old_status} на {new_status}")
                
        if updated_count > 0:
            db.commit()
            print(f"✅ [Celery] Успішно оновлено {updated_count} доставок.")
        else:
            print("⏭️ [Celery] Немає доставок для оновлення статусів.")
            
    except Exception as e:
        db.rollback()
        print(f"❌ [Celery] Помилка виконання задачі: {e}")
    finally:
        db.close()
