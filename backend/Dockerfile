FROM python:3.11-slim

# Установка системных зависимостей для psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем остальной код
COPY . .

# Экспортируем порт
EXPOSE 8000

# Команда запуска: ждем базу через shell-цикл, потом миграции, потом сидер, потом сервер
CMD ["sh", "-c", "until python -c 'import socket, os; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(1); s.connect((os.getenv(\"DB_HOST\", \"db\"), int(os.getenv(\"DB_PORT\", 5432))))' 2>/dev/null; do echo 'Waiting for database...'; sleep 1; done && echo 'Database is ready!' && alembic upgrade head && python seed.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
