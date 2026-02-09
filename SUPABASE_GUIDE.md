# 📘 Полный гайд по настройке Supabase

## 🎯 Что такое Supabase?

Supabase - это open-source альтернатива Firebase, предоставляющая:
- PostgreSQL базу данных
- Автоматические REST API
- Realtime подписки
- Аутентификацию
- Хранилище файлов

Для нашего бота мы используем PostgreSQL для хранения:
- Логов запросов (rate limiting)
- Истории поиска (аналитика)
- Статистики скачиваний

## 🚀 Шаг 1: Создание проекта

### 1.1 Регистрация

1. Открой [supabase.com](https://supabase.com)
2. Нажми "Start your project"
3. Войди через GitHub (рекомендуется) или Email

### 1.2 Создание проекта

1. Нажми "New Project"
2. Выбери организацию (или создай новую)
3. Заполни форму:
   ```
   Name: minecraft-mods-bot
   Database Password: [придумай надёжный пароль, сохрани его!]
   Region: [выбери ближайший к тебе]
   Pricing Plan: Free (достаточно для старта)
   ```
4. Нажми "Create new project"
5. Подожди ~2 минуты пока проект создаётся

## 🔑 Шаг 2: Получение ключей

### 2.1 API Settings

1. В боковом меню выбери "Project Settings" (иконка шестерёнки)
2. Выбери "API"
3. Найди секцию "Project API keys"

### 2.2 Копирование ключей

Тебе нужны два значения:

**Project URL:**
```
https://xxxxxxxxxxxxx.supabase.co
```
Это твой `SUPABASE_URL`

**anon public:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```
Это твой `SUPABASE_KEY`

⚠️ **Важно:** 
- `anon` ключ безопасен для клиента (используем его)
- `service_role` ключ НЕ используй в коде (только для админских задач)

### 2.3 Сохранение в .env

Открой `.env` и добавь:
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🗄️ Шаг 3: Создание таблиц

### 3.1 Открытие SQL Editor

1. В боковом меню выбери "SQL Editor"
2. Нажми "New query"

### 3.2 Выполнение SQL скрипта

**Вариант А: Использовать готовый скрипт**

1. Открой файл `supabase-setup.sql` в проекте
2. Скопируй всё содержимое
3. Вставь в SQL Editor
4. Нажми "Run" или `Ctrl+Enter`

**Вариант Б: Пошаговое создание**

#### Таблица user_requests

```sql
CREATE TABLE user_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  request_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_requests_user_timestamp 
ON user_requests(user_id, timestamp DESC);
```

Нажми "Run"

#### Таблица search_history

```sql
CREATE TABLE search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  query TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_history_user 
ON search_history(user_id, timestamp DESC);

CREATE INDEX idx_search_history_query 
ON search_history(query, timestamp DESC);
```

Нажми "Run"

#### Таблица download_stats (опционально)

```sql
CREATE TABLE download_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_name TEXT NOT NULL,
  project_id TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_download_stats_project 
ON download_stats(project_id, timestamp DESC);
```

Нажми "Run"

### 3.3 Проверка таблиц

1. В боковом меню выбери "Table Editor"
2. Должны появиться таблицы:
   - `user_requests`
   - `search_history`
   - `download_stats`

## 🔒 Шаг 4: Настройка безопасности (Row Level Security)

### 4.1 Что такое RLS?

Row Level Security (RLS) - это механизм PostgreSQL для контроля доступа к строкам таблицы.

### 4.2 Включение RLS

```sql
ALTER TABLE user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_stats ENABLE ROW LEVEL SECURITY;
```

### 4.3 Создание политик

```sql
-- Политика для service_role (полный доступ)
CREATE POLICY "Service role full access" 
ON user_requests FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role full access" 
ON search_history FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role full access" 
ON download_stats FOR ALL 
TO service_role
USING (true);

-- Политика для anon (только вставка)
CREATE POLICY "Anon can insert" 
ON user_requests FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can insert" 
ON search_history FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can insert" 
ON download_stats FOR INSERT 
TO anon
WITH CHECK (true);
```

### 4.4 Проверка политик

1. Выбери таблицу в Table Editor
2. Нажми на иконку замка (RLS)
3. Должны увидеть созданные политики

## 🔧 Шаг 5: Полезные функции

### 5.1 Функция автоочистки

```sql
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  DELETE FROM user_requests 
  WHERE timestamp < NOW() - INTERVAL '7 days';
  
  DELETE FROM search_history 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  DELETE FROM download_stats 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Cleanup completed';
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Функция статистики пользователя

```sql
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id BIGINT)
RETURNS TABLE(
  total_requests BIGINT,
  total_searches BIGINT,
  total_downloads BIGINT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM user_requests WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM search_history WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM download_stats WHERE user_id = p_user_id),
    (SELECT MAX(timestamp) FROM user_requests WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql;
```

### 5.3 Использование функций

```sql
-- Очистка старых данных
SELECT cleanup_old_data();

-- Статистика пользователя
SELECT * FROM get_user_stats(123456789);
```

## 📊 Шаг 6: Создание представлений (Views)

### 6.1 Топ пользователей

```sql
CREATE OR REPLACE VIEW top_users AS
SELECT 
  user_id,
  username,
  COUNT(*) as request_count,
  MAX(timestamp) as last_seen
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY user_id, username
ORDER BY request_count DESC
LIMIT 100;
```

### 6.2 Популярные запросы

```sql
CREATE OR REPLACE VIEW popular_searches AS
SELECT 
  query,
  COUNT(*) as search_count,
  AVG(result_count) as avg_results,
  MAX(timestamp) as last_searched
FROM search_history
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY query
ORDER BY search_count DESC
LIMIT 100;
```

### 6.3 Использование представлений

```sql
-- Топ пользователей
SELECT * FROM top_users LIMIT 10;

-- Популярные запросы
SELECT * FROM popular_searches LIMIT 20;
```

## ⏰ Шаг 7: Автоматическая очистка (pg_cron)

### 7.1 Включение расширения

```sql
-- Это может потребовать прав администратора
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 7.2 Создание расписания

```sql
-- Очистка каждый день в 3:00 UTC
SELECT cron.schedule(
  'cleanup-old-bot-data',
  '0 3 * * *',
  'SELECT cleanup_old_data();'
);
```

### 7.3 Проверка расписания

```sql
SELECT * FROM cron.job;
```

### 7.4 Удаление расписания

```sql
SELECT cron.unschedule('cleanup-old-bot-data');
```

## 🧪 Шаг 8: Тестирование

### 8.1 Вставка тестовых данных

```sql
-- Тестовый запрос
INSERT INTO user_requests (user_id, username, request_type)
VALUES (123456789, 'testuser', 'search_mod');

-- Тестовый поиск
INSERT INTO search_history (user_id, query, result_count)
VALUES (123456789, 'JEI', 10);

-- Проверка
SELECT * FROM user_requests ORDER BY timestamp DESC LIMIT 5;
SELECT * FROM search_history ORDER BY timestamp DESC LIMIT 5;
```

### 8.2 Тестирование rate limit

```sql
-- Вставка нескольких запросов
INSERT INTO user_requests (user_id, username, request_type)
SELECT 123456789, 'testuser', 'search_mod'
FROM generate_series(1, 5);

-- Проверка за последнюю минуту
SELECT COUNT(*) 
FROM user_requests 
WHERE user_id = 123456789 
  AND timestamp > NOW() - INTERVAL '1 minute';
```

### 8.3 Очистка тестовых данных

```sql
DELETE FROM user_requests WHERE user_id = 123456789;
DELETE FROM search_history WHERE user_id = 123456789;
```

## 📈 Шаг 9: Мониторинг

### 9.1 Размер базы данных

```sql
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size;
```

### 9.2 Размер таблиц

```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 9.3 Количество записей

```sql
SELECT 
  'user_requests' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as last_24h
FROM user_requests
UNION ALL
SELECT 
  'search_history',
  COUNT(*),
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours')
FROM search_history;
```

### 9.4 Последняя активность

```sql
SELECT 
  MAX(timestamp) as last_request,
  EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) / 60 as minutes_ago
FROM user_requests;
```

## 🔍 Шаг 10: Аналитика

### 10.1 Dashboard запрос

```sql
SELECT 
  (SELECT COUNT(DISTINCT user_id) FROM user_requests) as total_users,
  (SELECT COUNT(DISTINCT user_id) FROM user_requests 
   WHERE timestamp > NOW() - INTERVAL '24 hours') as daily_active,
  (SELECT COUNT(*) FROM user_requests 
   WHERE timestamp > NOW() - INTERVAL '24 hours') as requests_today,
  (SELECT COUNT(*) FROM search_history 
   WHERE timestamp > NOW() - INTERVAL '24 hours') as searches_today;
```

### 10.2 Использование в коде

Открой файл `supabase-analytics.sql` для полного списка аналитических запросов.

## 🆘 Решение проблем

### Ошибка: "permission denied"

**Решение:** Проверь RLS политики
```sql
-- Временно отключить RLS для теста
ALTER TABLE user_requests DISABLE ROW LEVEL SECURITY;
```

### Ошибка: "relation does not exist"

**Решение:** Таблица не создана
```sql
-- Проверь существующие таблицы
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Медленные запросы

**Решение:** Проверь индексы
```sql
-- Список индексов
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';
```

### База данных переполнена

**Решение:** Очисти старые данные
```sql
SELECT cleanup_old_data();
```

## 📚 Полезные ресурсы

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [SQL Tutorial](https://www.postgresqltutorial.com/)

## ✅ Финальный чеклист

- [ ] Проект создан в Supabase
- [ ] Ключи скопированы в `.env`
- [ ] Таблицы созданы
- [ ] Индексы созданы
- [ ] RLS настроен
- [ ] Функции созданы
- [ ] Представления созданы
- [ ] Тестовые данные вставлены и удалены
- [ ] Мониторинг работает

**Готово!** Теперь бот может использовать Supabase 🎉
