-- Отключение RLS только для таблиц (не для views)
ALTER TABLE user_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE search_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE download_stats DISABLE ROW LEVEL SECURITY;

-- Удаление всех политик
DROP POLICY IF EXISTS "Service role full access" ON user_requests;
DROP POLICY IF EXISTS "Service role full access" ON search_history;
DROP POLICY IF EXISTS "Service role full access" ON download_stats;
DROP POLICY IF EXISTS "Anon can insert" ON user_requests;
DROP POLICY IF EXISTS "Anon can insert" ON search_history;
DROP POLICY IF EXISTS "Anon can insert" ON download_stats;

-- Проверка
SELECT COUNT(*) as user_requests_count FROM user_requests;
SELECT COUNT(*) as search_history_count FROM search_history;
SELECT COUNT(*) as download_stats_count FROM download_stats;
