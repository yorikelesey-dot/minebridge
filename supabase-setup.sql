-- ============================================
-- Minecraft Mods Bot - Supabase Setup Script
-- ============================================
-- Выполни этот скрипт в Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query)
-- ============================================

-- 1. Создание таблицы для rate limiting
CREATE TABLE IF NOT EXISTS user_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  request_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Комментарии к таблице
COMMENT ON TABLE user_requests IS 'Логирование запросов пользователей для rate limiting';
COMMENT ON COLUMN user_requests.user_id IS 'Telegram User ID';
COMMENT ON COLUMN user_requests.username IS 'Telegram Username (опционально)';
COMMENT ON COLUMN user_requests.request_type IS 'Тип запроса: search_mod, search_shader, etc.';

-- Индекс для быстрой проверки rate limit
CREATE INDEX IF NOT EXISTS idx_user_requests_user_timestamp 
ON user_requests(user_id, timestamp DESC);

-- 2. Создание таблицы истории поиска
CREATE TABLE IF NOT EXISTS search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  query TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Комментарии к таблице
COMMENT ON TABLE search_history IS 'История поисковых запросов для аналитики';
COMMENT ON COLUMN search_history.query IS 'Поисковый запрос пользователя';
COMMENT ON COLUMN search_history.result_count IS 'Количество найденных результатов';

-- Индекс для аналитики
CREATE INDEX IF NOT EXISTS idx_search_history_user 
ON search_history(user_id, timestamp DESC);

-- Индекс для поиска популярных запросов
CREATE INDEX IF NOT EXISTS idx_search_history_query 
ON search_history(query, timestamp DESC);

-- 3. Создание таблицы статистики скачиваний (опционально)
CREATE TABLE IF NOT EXISTS download_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_name TEXT NOT NULL,
  project_id TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  source TEXT NOT NULL, -- 'modrinth' или 'curseforge'
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE download_stats IS 'Статистика скачиваний модов';

CREATE INDEX IF NOT EXISTS idx_download_stats_project 
ON download_stats(project_id, timestamp DESC);

-- 4. Функция автоматической очистки старых данных
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Удаляем запросы старше 7 дней (для rate limiting достаточно)
  DELETE FROM user_requests 
  WHERE timestamp < NOW() - INTERVAL '7 days';
  
  -- Удаляем историю поиска старше 30 дней
  DELETE FROM search_history 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Удаляем статистику скачиваний старше 90 дней
  DELETE FROM download_stats 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Cleanup completed successfully';
END;
$$ LANGUAGE plpgsql;

-- 5. Функция для получения статистики пользователя
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

-- 6. Представление для топ пользователей
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

-- 7. Представление для популярных запросов
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

-- 8. Настройка Row Level Security (опционально, для безопасности)
ALTER TABLE user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_stats ENABLE ROW LEVEL SECURITY;

-- Удаление существующих политик (если есть)
DROP POLICY IF EXISTS "Service role full access" ON user_requests;
DROP POLICY IF EXISTS "Service role full access" ON search_history;
DROP POLICY IF EXISTS "Service role full access" ON download_stats;
DROP POLICY IF EXISTS "Anon can insert" ON user_requests;
DROP POLICY IF EXISTS "Anon can insert" ON search_history;
DROP POLICY IF EXISTS "Anon can insert" ON download_stats;

-- Политика: сервис (бот) может делать всё
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

-- Политика: anon может только вставлять (для безопасности)
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

-- 9. Создание расписания для автоочистки (требует pg_cron extension)
-- Раскомментируй, если хочешь автоматическую очистку
/*
SELECT cron.schedule(
  'cleanup-old-bot-data',
  '0 3 * * *', -- Каждый день в 3:00 UTC
  'SELECT cleanup_old_data();'
);
*/

-- ============================================
-- Готово! Теперь можно использовать бота
-- ============================================

-- Проверка созданных таблиц
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('user_requests', 'search_history', 'download_stats')
ORDER BY table_name;

-- Вывод сообщения об успехе
DO $$
BEGIN
  RAISE NOTICE '✅ Supabase setup completed successfully!';
  RAISE NOTICE '📊 Tables created: user_requests, search_history, download_stats';
  RAISE NOTICE '🔍 Views created: top_users, popular_searches';
  RAISE NOTICE '🛡️ Row Level Security enabled';
  RAISE NOTICE '🚀 Bot is ready to use!';
END $$;
