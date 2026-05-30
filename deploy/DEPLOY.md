# Deploy на VPS

## Что нужно от тебя

- VPS с Ubuntu 22.04+, открытые порты 80, 443
- Два DNS A-записи на IP сервера:
  - `app.твой-домен.ru`     → IP
  - `admin.твой-домен.ru`   → IP
- SSH-доступ

## Шаги

### 1. Поставить Docker на VPS

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER  # перелогиниться после
```

### 2. Клонировать репо

```bash
git clone <repo-url> gomentor
cd gomentor
```

### 3. Создать .env

```bash
cp .env.example .env
nano .env  # заполнить APP_DOMAIN, ADMIN_DOMAIN, LETSENCRYPT_EMAIL, JWT_SECRET, POSTGRES_PASSWORD
```

`JWT_SECRET` сгенерируй: `openssl rand -hex 32`
`POSTGRES_PASSWORD` сгенерируй: `openssl rand -hex 24`

### 4. Первый запуск без SSL (для ACME-challenge)

Временно отредактируй `deploy/nginx.conf` — закомментируй два `server` блока с `listen 443 ssl` (или используй временный конфиг). Потом:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file .env up -d --build
```

Проверь что бэкенд поднялся: `docker logs gomentor-backend`. Миграции `000001_init` и `000002_seed` должны примениться автоматически.

### 5. Получить SSL-сертификат

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file .env run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d "$APP_DOMAIN" -d "$ADMIN_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
```

### 6. Включить HTTPS

Вернуть `listen 443 ssl` блоки в `deploy/nginx.conf` и перезапустить nginx:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file .env restart nginx
```

### 7. Проверить

- `https://app.твой-домен.ru` → Login Student/Buddy
- `https://admin.твой-домен.ru` → Login Admin

## Demo-аккаунты

| Логин      | Пароль       | Роли             |
|------------|--------------|------------------|
| admin      | Admin123!    | admin            |
| buddy      | Buddy123!    | buddy            |
| multi      | Multi123!    | student + buddy  |
| student1   | Student123!  | student          |
| student2   | Student123!  | student          |
| student3   | Student123!  | student          |

**ВАЖНО:** после первого входа замени пароли через Admin-панель.

## Обновление

```bash
git pull
docker compose -f deploy/docker-compose.prod.yml --env-file .env up -d --build
```

## Troubleshooting

- **Миграции не применились:** `docker logs gomentor-backend` — там будет SQL-ошибка.
- **SSL не выдаётся:** проверь что DNS уже резолвится в IP сервера. Дай 5-10 минут на распространение.
- **502 от nginx:** проверь что бэкенд жив (`docker logs gomentor-backend`) и Postgres healthy.
