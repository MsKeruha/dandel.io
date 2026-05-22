import uvicorn
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine
import models
from routers import auth, deliveries, users, chat, fleet

app = FastAPI(
    title="dandel.io API",
    description="Premium Multi-Criteria Smart Logistics System",
    version="1.1.0"
)

# Налаштовуємо CORS для підключення фронтенду на Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшені змінити на конкретний домен
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Підключаємо роутери
app.include_router(auth.router)
app.include_router(deliveries.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(fleet.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "dandel.io", "version": "1.0.0"}

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    vehicle_count = db.query(models.Vehicle).count()
    if vehicle_count == 0:
        vehicle_count = 142
    
    return {
        "vehicle_count": vehicle_count,
        "on_time_percentage": 99.8,
        "cashback_percentage": 5
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
