# Стейдж 1: Збірка React-додатку (Vite)
FROM node:20-alpine AS builder

WORKDIR /app

# Копіюємо файли залежностей та встановлюємо їх
COPY package*.json ./
RUN npm install

# Копіюємо код та збираємо продакшн-бандл
COPY . .
RUN npm run build

# Стейдж 2: Роздача статики через Nginx
FROM nginx:alpine

# Копіюємо кастомний конфіг Nginx (для підтримки React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копіюємо зібрані файли зі стейджу 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
