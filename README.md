# Minecraft Mods Telegram Bot

Telegram-бот для поиска и скачивания модов, шейдеров и ресурспаков Minecraft через API Modrinth и CurseForge.

## 🚀 Возможности

- 🔍 Поиск модов, шейдеров и ресурспаков
- 📥 Автоматическое скачивание файлов до 50 МБ
- 🔗 Прямые ссылки для больших файлов
- ⚡ Оптимизирован для Vercel (Serverless)
- 🛡️ Rate limiting (3 запроса в минуту)
- 📊 Логирование в Supabase
- 🎮 Поддержка версий игры и загрузчиков (Forge/Fabric/Quilt)

## 📋 Требования

- Node.js 18+
- Telegram Bot Token (от @BotFather)
- CurseForge API Key (опционально)
- Supabase проект
- Vercel аккаунт

## 🔧 Установка

### 1. Клонирование и установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создай файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполни переменные:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
CURSEFORGE_API_KEY=your_curseforge_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
WEBHOOK_DOMAIN=your-project.vercel.app
```

### 3. Настройка Supabase

#### Создание таблиц

Выполни следующие SQL-запросы в Supabase SQL Editor:

```sql
-- Таблица для логирования запросов
CREATE TABLE user_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  request_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для быстрой проверки rate limit
CREATE INDEX idx_user_requests_user_timestamp 
ON user_requests(user_id, timestamp DESC);

-- Таблица истории поиска
CREATE TABLE search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  query TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для аналитики
CREATE INDEX idx_search_history_user 
ON search_history(user_id, timestamp DESC);

-- Автоматическая очистка старых записей (опционально)
CREATE OR REPLACE FUNCTION cleanup_old_requests()
RETURNS void AS $$
BEGIN
  DELETE FROM user_requests 
  WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
```

#### Настройка Row Level Security (опционально)

```sql
-- Включить RLS
ALTER TABLE user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Политика: сервис может делать всё
CREATE POLICY "Service role can do everything" 
ON user_requests FOR ALL 
USING (true);

CREATE POLICY "Service role can do everything" 
ON search_history FOR ALL 
USING (true);
```

### 4. Получение CurseForge API Key (опционально)

1. Зарегистрируйся на [CurseForge Console](https://console.curseforge.com/)
2. Создай новое приложение
3. Скопируй API Key

### 5. Локальная разработка

```bash
npm run dev
```

Бот запустится в режиме long polling для тестирования.

## 🚀 Деплой на Vercel

### 1. Установка Vercel CLI

```bash
npm i -g vercel
```

### 2. Логин в Vercel

```bash
vercel login
```

### 3. Деплой проекта

```bash
vercel
```

### 4. Настройка переменных окружения в Vercel

```bash
vercel env add TELEGRAM_BOT_TOKEN
vercel env add CURSEFORGE_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
vercel env add WEBHOOK_DOMAIN
```

Или через веб-интерфейс: Project Settings → Environment Variables

### 5. Установка вебхука

После деплоя открой в браузере:

```
https://your-project.vercel.app/api/webhook
```

Это автоматически установит вебхук для бота.

## 📱 Использование

1. Найди своего бота в Telegram
2. Отправь `/start`
3. Выбери категорию или используй поиск
4. Выбери нужный мод/шейдер
5. Выбери версию для скачивания

## 🛠️ Структура проекта

```
├── api/
│   └── webhook.ts          # Vercel serverless function
├── src/
│   ├── api/
│   │   ├── modrinth.ts     # Modrinth API
│   │   └── curseforge.ts   # CurseForge API
│   ├── utils/
│   │   └── download.ts     # Утилиты скачивания
│   ├── bot.ts              # Логика бота
│   ├── config.ts           # Конфигурация
│   ├── database.ts         # Supabase интеграция
│   ├── keyboards.ts        # Inline клавиатуры
│   └── index.ts            # Точка входа (dev)
├── .env.example
├── package.json
├── tsconfig.json
└── vercel.json
```

## 🔒 Безопасность

- Rate limiting: 3 запроса в минуту на пользователя
- Все API ключи в переменных окружения
- Логирование всех действий в Supabase
- Обработка ошибок без падения бота

## 📊 Мониторинг

Проверяй логи в Supabase:

```sql
-- Топ пользователей
SELECT user_id, username, COUNT(*) as requests
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_id, username
ORDER BY requests DESC
LIMIT 10;

-- Популярные запросы
SELECT query, COUNT(*) as count
FROM search_history
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY count DESC
LIMIT 20;
```

## 🐛 Отладка

Проверь логи Vercel:

```bash
vercel logs
```

Или в веб-интерфейсе: Project → Deployments → Logs

## 📝 Лицензия

MIT
