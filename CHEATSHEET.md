# 📝 Шпаргалка по командам

## 🚀 Быстрый старт

```bash
# Установка
npm install

# Настройка
cp .env.example .env
# Заполни .env

# Запуск
npm run dev
```

## 📦 NPM команды

```bash
npm run dev          # Разработка (hot reload)
npm run build        # Сборка TypeScript
npm run start        # Запуск production
npm run type-check   # Проверка типов
```

## 🌐 Vercel команды

```bash
# Установка CLI
npm i -g vercel

# Логин
vercel login

# Деплой
vercel              # Preview
vercel --prod       # Production

# Переменные окружения
vercel env add VARIABLE_NAME
vercel env ls
vercel env rm VARIABLE_NAME

# Логи
vercel logs
vercel logs --follow

# Домены
vercel domains ls
vercel domains add example.com

# Проекты
vercel ls
vercel rm project-name
```

## 🗄️ Supabase SQL

### Создание таблиц

```sql
-- user_requests
CREATE TABLE user_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  request_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- search_history
CREATE TABLE search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  query TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### Быстрые запросы

```sql
-- Статистика за сегодня
SELECT COUNT(*) FROM user_requests 
WHERE timestamp > CURRENT_DATE;

-- Топ пользователей
SELECT user_id, COUNT(*) as count 
FROM user_requests 
GROUP BY user_id 
ORDER BY count DESC 
LIMIT 10;

-- Популярные запросы
SELECT query, COUNT(*) as count 
FROM search_history 
GROUP BY query 
ORDER BY count DESC 
LIMIT 20;

-- Очистка старых данных
DELETE FROM user_requests 
WHERE timestamp < NOW() - INTERVAL '7 days';
```

## 🤖 Telegram Bot API

### Основные методы

```typescript
// Отправка сообщения
await ctx.reply('Текст');

// С клавиатурой
await ctx.reply('Текст', keyboard);

// Редактирование
await ctx.editMessageText('Новый текст');

// Ответ на callback
await ctx.answerCbQuery('Текст');

// Отправка файла
await ctx.replyWithDocument({ 
  source: buffer, 
  filename: 'file.jar' 
});

// Отправка фото
await ctx.replyWithPhoto({ url: 'https://...' });
```

### Обработчики

```typescript
// Команда
bot.command('start', async (ctx) => {});

// Текст
bot.on('text', async (ctx) => {});

// Callback кнопки
bot.action('button_id', async (ctx) => {});

// Regex callback
bot.action(/pattern_(.+)/, async (ctx) => {});

// Документ
bot.on('document', async (ctx) => {});
```

## 🔧 Полезные функции

### Rate Limiting

```typescript
// Проверка
const allowed = await checkRateLimit(userId);
if (!allowed) {
  return ctx.answerCbQuery('Слишком много запросов');
}

// Логирование
await logRequest(userId, username, 'action_type');
```

### Работа с файлами

```typescript
// Скачивание
const buffer = await downloadFile(url);

// Проверка размера
const canSend = canSendDirectly(fileSize);

// Форматирование размера
const size = formatFileSize(bytes); // "15.5 MB"
```

### Поиск

```typescript
// Modrinth
const results = await searchModrinth(query, 'mod');
const versions = await getModrinthVersions(projectId);

// CurseForge
const results = await searchCurseForge(query, 6);
const files = await getCurseForgeFiles(modId);
```

## 🔑 Переменные окружения

```env
# Обязательные
TELEGRAM_BOT_TOKEN=1234567890:ABC...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGci...

# Опциональные
CURSEFORGE_API_KEY=your_key
WEBHOOK_DOMAIN=your-app.vercel.app
```

## 📊 Мониторинг

### Vercel

```bash
# Логи в реальном времени
vercel logs --follow

# Последние 100 строк
vercel logs -n 100

# Фильтр по ошибкам
vercel logs | grep -i error
```

### Supabase

```sql
-- Последняя активность
SELECT MAX(timestamp) FROM user_requests;

-- Ошибки за час
SELECT COUNT(*) FROM error_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Размер БД
SELECT pg_size_pretty(pg_database_size(current_database()));
```

## 🐛 Отладка

### Проверка бота

```bash
# Локально
npm run dev

# Проверка токена
curl https://api.telegram.org/bot<TOKEN>/getMe

# Проверка вебхука
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

### Проверка Supabase

```typescript
// Тест подключения
const { data, error } = await supabase
  .from('user_requests')
  .select('count');

console.log('Connection:', error ? 'Failed' : 'OK');
```

### Проверка API

```bash
# Modrinth
curl "https://api.modrinth.com/v2/search?query=jei"

# CurseForge
curl -H "x-api-key: YOUR_KEY" \
  "https://api.curseforge.com/v1/mods/search?gameId=432"
```

## 🔄 Git команды

```bash
# Инициализация
git init
git add .
git commit -m "Initial commit"

# Пуш
git remote add origin <url>
git push -u origin main

# Обновление
git add .
git commit -m "Update"
git push

# Откат
git reset --hard HEAD~1
git push --force
```

## 🆘 Быстрые решения

### Бот не отвечает

```bash
# 1. Проверь токен
echo $TELEGRAM_BOT_TOKEN

# 2. Проверь логи
vercel logs

# 3. Переустанови вебхук
curl https://your-app.vercel.app/api/webhook
```

### Ошибка Supabase

```sql
-- 1. Проверь таблицы
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 2. Отключи RLS
ALTER TABLE user_requests DISABLE ROW LEVEL SECURITY;

-- 3. Проверь данные
SELECT * FROM user_requests LIMIT 1;
```

### Ошибка деплоя

```bash
# 1. Проверь переменные
vercel env ls

# 2. Пересобери
npm run build

# 3. Передеплой
vercel --prod --force
```

## 📱 Полезные ссылки

- Bot: `https://t.me/your_bot`
- Webhook: `https://your-app.vercel.app/api/webhook`
- Supabase: `https://app.supabase.com/project/xxx`
- Vercel: `https://vercel.com/your-username/your-project`

## 🎯 Быстрые тесты

```bash
# Тест локально
npm run dev
# Открой Telegram → /start

# Тест на Vercel
vercel --prod
# Открой https://your-app.vercel.app/api/webhook
# Открой Telegram → /start

# Тест Supabase
# SQL Editor → SELECT * FROM user_requests;
```

## 💡 Горячие клавиши

### VS Code
- `Ctrl+Shift+P` - Command Palette
- `Ctrl+`` - Terminal
- `F5` - Debug

### Supabase SQL Editor
- `Ctrl+Enter` - Run query
- `Ctrl+/` - Comment
- `Ctrl+S` - Save

### Telegram
- `/start` - Запуск бота
- `/help` - Помощь
- `/stats` - Статистика

---

**Сохрани эту шпаргалку!** 📌
