# 🔴 Настройка Redis для кэширования

## Зачем нужен Redis?

Redis используется для кэширования результатов поиска и версий модов, что значительно ускоряет работу бота и снижает нагрузку на API Modrinth/CurseForge.

**Преимущества:**
- ⚡ Быстрый доступ к часто запрашиваемым данным
- 📉 Снижение количества запросов к API
- 🚀 Улучшение производительности бота
- 💰 Экономия лимитов API

**Важно:** Redis опционален! Если он не настроен, бот будет работать без кэширования.

## Варианты установки

### 1. Локальная разработка (Windows)

#### Вариант A: Redis через WSL2 (рекомендуется)

```bash
# В WSL2 Ubuntu
sudo apt update
sudo apt install redis-server
sudo service redis-server start

# Проверка
redis-cli ping
# Должно вернуть: PONG
```

Добавить в `.env`:
```env
REDIS_URL=redis://localhost:6379
```

#### Вариант B: Memurai (Redis для Windows)

1. Скачать: https://www.memurai.com/get-memurai
2. Установить и запустить
3. Добавить в `.env`:
```env
REDIS_URL=redis://localhost:6379
```

### 2. Облачные сервисы (для продакшна)

#### Upstash (рекомендуется для Vercel)

1. Зарегистрироваться: https://upstash.com/
2. Создать Redis базу данных
3. Скопировать `UPSTASH_REDIS_REST_URL`
4. Добавить в `.env` и Vercel:

```env
REDIS_URL=rediss://default:password@host.upstash.io:6379
```

**Преимущества Upstash:**
- ✅ Бесплатный тариф (10,000 команд/день)
- ✅ Serverless - оплата за использование
- ✅ Интеграция с Vercel
- ✅ Автоматическое масштабирование

#### Redis Cloud

1. Зарегистрироваться: https://redis.com/try-free/
2. Создать базу данных
3. Получить connection string
4. Добавить в `.env`:

```env
REDIS_URL=redis://default:password@host:port
```

#### Railway

1. Зарегистрироваться: https://railway.app/
2. Создать новый проект
3. Добавить Redis сервис
4. Скопировать `REDIS_URL` из переменных окружения

### 3. Docker (для разработки)

```bash
# Запустить Redis в Docker
docker run -d -p 6379:6379 redis:alpine

# Проверка
docker ps
```

Добавить в `.env`:
```env
REDIS_URL=redis://localhost:6379
```

## Настройка переменных окружения

### Локально (.env файл)

```env
# Redis URL (опционально)
REDIS_URL=redis://localhost:6379

# Или для Upstash
REDIS_URL=rediss://default:password@host.upstash.io:6379
```

### Vercel

```bash
# Через CLI
vercel env add REDIS_URL

# Или в веб-интерфейсе:
# Settings → Environment Variables → Add
```

## Проверка работы

### 1. Проверка подключения

```bash
# Локально
redis-cli ping

# Через код (добавить в bot.ts временно)
import { cacheService } from './services/cache-service';
console.log('Redis status:', cacheService.enabled ? '✅ Connected' : '❌ Disabled');
```

### 2. Мониторинг кэша

Логи бота покажут:
```
✅ Redis connected
📦 Cache hit: search:jei:mod
💾 Cache set: versions:P7dR8mSH
```

### 3. Проверка через Redis CLI

```bash
# Подключиться
redis-cli

# Посмотреть все ключи
KEYS *

# Посмотреть значение
GET search:jei:mod

# Посмотреть TTL (время жизни)
TTL search:jei:mod

# Очистить весь кэш
FLUSHALL
```

## Настройка кэша

Время жизни кэша можно изменить в `src/services/cache-service.ts`:

```typescript
// Поиск - 10 минут (600 секунд)
await this.redis.setex(key, 600, JSON.stringify(results));

// Версии - 1 час (3600 секунд)
await this.redis.setex(key, 3600, JSON.stringify(versions));
```

## Мониторинг и статистика

### Upstash Dashboard
- Количество команд
- Использование памяти
- Latency

### Redis CLI
```bash
# Статистика
INFO stats

# Использование памяти
INFO memory

# Количество ключей
DBSIZE
```

## Troubleshooting

### Ошибка: "Connection refused"

```bash
# Проверить, запущен ли Redis
redis-cli ping

# Перезапустить Redis
sudo service redis-server restart  # Linux/WSL
# или
net stop Redis && net start Redis  # Windows (Memurai)
```

### Ошибка: "NOAUTH Authentication required"

Redis требует пароль. Добавить в URL:
```env
REDIS_URL=redis://default:password@host:6379
```

### Бот работает медленно с Redis

1. Проверить latency:
```bash
redis-cli --latency
```

2. Использовать ближайший регион (для облачных сервисов)
3. Увеличить время жизни кэша

### Redis не подключается на Vercel

1. Использовать `rediss://` (с SSL) для Upstash
2. Проверить, что переменная `REDIS_URL` добавлена в Vercel
3. Проверить, что IP Vercel не заблокирован в Redis Cloud

## Рекомендации

### Для разработки:
- ✅ Docker или WSL2 с Redis
- ✅ Локальный Redis на порту 6379

### Для продакшна:
- ✅ Upstash (для Vercel)
- ✅ Redis Cloud (для других платформ)
- ✅ Railway (простая настройка)

### Без Redis:
- ✅ Бот работает нормально
- ⚠️ Больше запросов к API
- ⚠️ Медленнее отклик

## Стоимость

### Бесплатные тарифы:

**Upstash:**
- 10,000 команд/день
- 256 MB памяти
- Достаточно для ~1000 пользователей/день

**Redis Cloud:**
- 30 MB памяти
- Достаточно для небольших ботов

**Railway:**
- $5 кредитов/месяц
- Хватает на Redis + другие сервисы

## Дополнительные ресурсы

- [Redis Documentation](https://redis.io/docs/)
- [Upstash Documentation](https://docs.upstash.com/)
- [ioredis Documentation](https://github.com/redis/ioredis)
