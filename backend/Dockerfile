FROM python:3.11-slim

# Встановлення системних залежностей для psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копіюємо залежності
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо решту коду
COPY . .

# Експортуємо порт
EXPOSE 8000

# Команда запуску: чекаємо на базу через shell-цикл, потім міграції, потім сидер, потім сервер
CMD ["sh", "-c", "until python -c 'import socket, os; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(1); s.connect((os.getenv(\"DB_HOST\", \"db\"), int(os.getenv(\"DB_PORT\", 5432))))' 2>/dev/null; do echo 'Waiting for database...'; sleep 1; done && echo 'Database is ready!' && alembic upgrade head && python seed.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
