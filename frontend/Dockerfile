FROM node:20-alpine

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
RUN npm install

# Копируем код
COPY . .

# Экспортируем порт Vite
EXPOSE 5173

# Запуск в режиме разработки для быстрой правки (или можно сменить на build + serve)
CMD ["npm", "run", "dev", "--", "--host"]
