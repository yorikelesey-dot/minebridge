# 📖 Полный гайд по настройке

## 1️⃣ Создание Telegram бота

### Шаг 1: Получение токена

1. Открой Telegram и найди [@BotFather](https://t.me/botfather)
2. Отправь команду `/newbot`
3. Введи имя бота (например: `Minecraft Mods Helper`)
4. Введи username бота (должен заканчиваться на `bot`, например: `minecraft_mods_helper_bot`)
5. Скопируй полученный токен (выглядит как `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Шаг 2: Настройка бота

Отправь @BotFather следующие команды:

```
/setdescription - Бот для поиска и скачивания модов Minecraft
/setabouttext - Поиск модов, шейдеров и ресурспаков через Modrinth API
/setcommands - start - Запустить бота
```

## 2️⃣ Настройка Supabase

### Шаг 1: Создание проекта

1. Зайди на [supabase.com](https://supabase.com)
2. Нажми "Start your project"
3. Создай новый проект:
   - Name: `minecraft-mods-bot`
   - Database Password: (придумай надёжный пароль)
   - Region: выбери ближайший к тебе
4. Дождись создания проекта (~2 минуты)

### Шаг 2: Получение ключей

1. В боковом меню выбери "Project Settings" → "API"
2. Скопируй:
   - `Project URL` → это твой `SUPABASE_URL`
   - `anon public` ключ → это твой `SUPABASE_KEY`

### Шаг 3: Создание таблиц

1. В боковом меню выбери "SQL Editor"
2. Нажми "New query"
3. Вставь и выполни следующий SQL:

```sql
-- Таблица для rate limiting
CREATE TABLE user_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  request_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для быстрой проверки
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

-- Функция автоочистки (запускается раз в день)
CREATE OR REPLACE FUNCTION cleanup_old_requests()
RETURNS void AS $$
BEGIN
  DELETE FROM user_requests 
  WHERE timestamp < NOW() - INTERVAL '7 days';
  
  DELETE FROM search_history 
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Создание расписания для автоочистки
SELECT cron.schedule(
  'cleanup-old-data',
  '0 3 * * *', -- Каждый день в 3:00
  'SELECT cleanup_old_requests();'
);
```

4. Нажми "Run" или `Ctrl+Enter`

### Шаг 4: Проверка таблиц

1. В боковом меню выбери "Table Editor"
2. Убедись, что видишь таблицы `user_requests` и `search_history`

## 3️⃣ Получение CurseForge API Key (опционально)

### Вариант 1: Без CurseForge

Бот будет работать только с Modrinth API (этого достаточно для большинства модов).

### Вариант 2: С CurseForge

1. Зайди на [console.curseforge.com](https://console.curseforge.com/)
2. Зарегистрируйся или войди
3. Нажми "Create New API Key"
4. Заполни форму:
   - Name: `Minecraft Mods Bot`
   - Contact Email: твой email
   - Description: `Telegram bot for searching mods`
5. Прими условия использования
6. Скопируй полученный API Key

## 4️⃣ Настройка проекта

### Шаг 1: Установка зависимостей

```bash
npm install
```

### Шаг 2: Создание .env файла

```bash
cp .env.example .env
```

Открой `.env` и заполни:

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
CURSEFORGE_API_KEY=your_key_or_leave_empty
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WEBHOOK_DOMAIN=your-project.vercel.app
```

**Важно:** `WEBHOOK_DOMAIN` заполнишь после деплоя на Vercel!

### Шаг 3: Локальное тестирование

```bash
npm run dev
```

Если всё настроено правильно, увидишь:

```
🚀 Starting bot in development mode...
✅ Bot started successfully!
```

Открой Telegram и отправь боту `/start` — должно появиться меню.

## 5️⃣ Деплой на Vercel

### Шаг 1: Установка Vercel CLI

```bash
npm install -g vercel
```

### Шаг 2: Логин

```bash
vercel login
```

Выбери способ входа (GitHub, GitLab, Email).

### Шаг 3: Первый деплой

```bash
vercel
```

Ответь на вопросы:

```
? Set up and deploy "~/minecraft-bot"? [Y/n] y
? Which scope do you want to deploy to? Your Name
? Link to existing project? [y/N] n
? What's your project's name? minecraft-mods-bot
? In which directory is your code located? ./
```

Дождись завершения деплоя. В конце увидишь URL:

```
✅ Production: https://minecraft-mods-bot.vercel.app
```

### Шаг 4: Добавление переменных окружения

```bash
vercel env add TELEGRAM_BOT_TOKEN
# Вставь токен бота

vercel env add SUPABASE_URL
# Вставь URL Supabase

vercel env add SUPABASE_KEY
# Вставь ключ Supabase

vercel env add CURSEFORGE_API_KEY
# Вставь ключ CurseForge (или оставь пустым)

vercel env add WEBHOOK_DOMAIN
# Вставь домен без https:// (например: minecraft-mods-bot.vercel.app)
```

Для каждой переменной выбери:

```
? Add TELEGRAM_BOT_TOKEN to which Environments? Production, Preview, Development
```

### Шаг 5: Повторный деплой

```bash
vercel --prod
```

### Шаг 6: Установка вебхука

Открой в браузере:

```
https://minecraft-mods-bot.vercel.app/api/webhook
```

Должен увидеть:

```json
{
  "ok": true,
  "message": "Webhook set successfully",
  "url": "https://minecraft-mods-bot.vercel.app/api/webhook"
}
```

## 6️⃣ Проверка работы

### Тест 1: Основное меню

1. Открой бота в Telegram
2. Отправь `/start`
3. Должны появиться кнопки: "Моды", "Шейдеры", "Ресурспаки", "Поиск"

### Тест 2: Поиск мода

1. Нажми "Моды"
2. Введи `JEI` (популярный мод)
3. Должен появиться список результатов
4. Выбери первый результат
5. Выбери версию для скачивания

### Тест 3: Rate Limiting

1. Быстро нажми кнопку "Моды" 4 раза подряд
2. На 4-й раз должно появиться: "⏳ Слишком много запросов. Подожди минуту."

### Тест 4: Проверка логов в Supabase

1. Открой Supabase → Table Editor → `user_requests`
2. Должны появиться записи о твоих действиях

## 7️⃣ Мониторинг и отладка

### Просмотр логов Vercel

```bash
vercel logs
```

Или в веб-интерфейсе:
1. Зайди на [vercel.com](https://vercel.com)
2. Выбери проект
3. Deployments → Latest → Logs

### Аналитика в Supabase

```sql
-- Статистика за последние 24 часа
SELECT 
  request_type,
  COUNT(*) as count
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY request_type
ORDER BY count DESC;

-- Топ-10 пользователей
SELECT 
  user_id,
  username,
  COUNT(*) as requests
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY user_id, username
ORDER BY requests DESC
LIMIT 10;

-- Популярные поисковые запросы
SELECT 
  query,
  COUNT(*) as searches,
  AVG(result_count) as avg_results
FROM search_history
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY searches DESC
LIMIT 20;
```

## 8️⃣ Обновление бота

### Локальные изменения

1. Внеси изменения в код
2. Протестируй локально: `npm run dev`
3. Задеплой: `vercel --prod`

### Обновление через Git

```bash
git add .
git commit -m "Update bot"
git push
```

Vercel автоматически задеплоит изменения.

## 🆘 Решение проблем

### Бот не отвечает

1. Проверь логи: `vercel logs`
2. Убедись, что вебхук установлен: открой `/api/webhook` в браузере
3. Проверь переменные окружения в Vercel

### Ошибка "Rate limit"

Это нормально — защита от спама. Подожди 1 минуту.

### Ошибка Supabase

1. Проверь правильность `SUPABASE_URL` и `SUPABASE_KEY`
2. Убедись, что таблицы созданы
3. Проверь логи в Supabase → Logs

### Файлы не скачиваются

1. Проверь размер файла (больше 50 МБ → только ссылка)
2. Проверь доступность Modrinth API
3. Посмотри логи ошибок

## 📞 Поддержка

- Документация Telegraf: https://telegraf.js.org
- Документация Supabase: https://supabase.com/docs
- Modrinth API: https://docs.modrinth.com
- CurseForge API: https://docs.curseforge.com

## ✅ Чеклист готовности

- [ ] Создан Telegram бот через @BotFather
- [ ] Создан проект в Supabase
- [ ] Созданы таблицы в Supabase
- [ ] Получен CurseForge API Key (опционально)
- [ ] Установлены зависимости (`npm install`)
- [ ] Создан и заполнен `.env` файл
- [ ] Протестирован локально (`npm run dev`)
- [ ] Задеплоен на Vercel (`vercel --prod`)
- [ ] Добавлены переменные окружения в Vercel
- [ ] Установлен вебхук (открыт `/api/webhook`)
- [ ] Протестирован в Telegram

Готово! 🎉
