import os
import uvicorn
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine
import models
from routers import auth, deliveries, users, chat, fleet

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from logger import setup_logging
from loguru import logger

# Ініціалізуємо Rate Limiter (ліміт за IP адресою клієнта)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="dandel.io API",
    description="Premium Multi-Criteria Smart Logistics System",
    version="1.1.0"
)

# Підключаємо Limiter до додатку
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Налаштовуємо логи
setup_logging()
logger.info("Starting dandel.io API...")

# Налаштовуємо CORS
frontend_url_env = os.getenv("FRONTEND_URL", "http://localhost:5173,http://localhost,http://127.0.0.1")
allow_origins = [url.strip() for url in frontend_url_env.split(",")]

logger.info(f"Configured CORS allow_origins: {allow_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
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
@limiter.limit("10/minute")
def health_check(request: Request):
    logger.debug("Health check requested")
    return {"status": "ok", "app": "dandel.io", "version": "1.0.0"}

@app.get("/api/stats")
@limiter.limit("60/minute")
def get_stats(request: Request, db: Session = Depends(get_db)):
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
