import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
