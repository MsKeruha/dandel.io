import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Завантажуємо змінні середовища з файлу .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "dandelion")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

# Динамічно збираємо рядок підключення до PostgreSQL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Створюємо двигун SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

# Створюємо фабрику сесій
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовий клас для декларативних моделей
Base = declarative_base()

# Строге дотримання специфікації стандарту для ініціалізації сесій БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
