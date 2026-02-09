-- ============================================
-- Полезные SQL-запросы для аналитики бота
-- ============================================
-- Используй эти запросы в Supabase SQL Editor
-- для мониторинга и анализа работы бота
-- ============================================

-- 1. ОБЩАЯ СТАТИСТИКА
-- ============================================

-- Общее количество пользователей
SELECT COUNT(DISTINCT user_id) as total_users
FROM user_requests;

-- Активность за последние 24 часа
SELECT 
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_requests
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- Активность за последние 7 дней
SELECT 
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_requests,
  COUNT(*) / 7.0 as avg_requests_per_day
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '7 days';

-- 2. СТАТИСТИКА ПО ТИПАМ ЗАПРОСОВ
-- ============================================

-- Распределение типов запросов
SELECT 
  request_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY request_type
ORDER BY count DESC;

-- Типы запросов по дням
SELECT 
  DATE(timestamp) as date,
  request_type,
  COUNT(*) as count
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), request_type
ORDER BY date DESC, count DESC;

-- 3. ТОП ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

-- Топ-20 самых активных пользователей за неделю
SELECT 
  user_id,
  username,
  COUNT(*) as requests,
  COUNT(DISTINCT DATE(timestamp)) as active_days,
  MIN(timestamp) as first_seen,
  MAX(timestamp) as last_seen
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY user_id, username
ORDER BY requests DESC
LIMIT 20;

-- Новые пользователи за последние 7 дней
SELECT 
  DATE(MIN(timestamp)) as registration_date,
  COUNT(DISTINCT user_id) as new_users
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(MIN(timestamp))
ORDER BY registration_date DESC;

-- 4. СТАТИСТИКА ПОИСКА
-- ============================================

-- Топ-30 популярных поисковых запросов
SELECT 
  query,
  COUNT(*) as searches,
  AVG(result_count) as avg_results,
  MAX(timestamp) as last_searched
FROM search_history
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY query
ORDER BY searches DESC
LIMIT 30;

-- Запросы без результатов (для улучшения)
SELECT 
  query,
  COUNT(*) as failed_searches
FROM search_history
WHERE result_count = 0
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY failed_searches DESC
LIMIT 20;

-- Средняя эффективность поиска
SELECT 
  AVG(result_count) as avg_results,
  COUNT(CASE WHEN result_count = 0 THEN 1 END) * 100.0 / COUNT(*) as zero_results_percentage
FROM search_history
WHERE timestamp > NOW() - INTERVAL '7 days';

-- 5. ВРЕМЕННАЯ АНАЛИТИКА
-- ============================================

-- Активность по часам (UTC)
SELECT 
  EXTRACT(HOUR FROM timestamp) as hour,
  COUNT(*) as requests
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM timestamp)
ORDER BY hour;

-- Активность по дням недели
SELECT 
  TO_CHAR(timestamp, 'Day') as day_of_week,
  EXTRACT(DOW FROM timestamp) as day_number,
  COUNT(*) as requests
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY TO_CHAR(timestamp, 'Day'), EXTRACT(DOW FROM timestamp)
ORDER BY day_number;

-- Динамика роста по дням
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as requests,
  COUNT(DISTINCT user_id) as unique_users
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- 6. RATE LIMITING СТАТИСТИКА
-- ============================================

-- Пользователи, достигшие rate limit
SELECT 
  user_id,
  username,
  COUNT(*) as requests_in_minute
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '1 minute'
GROUP BY user_id, username
HAVING COUNT(*) >= 3
ORDER BY requests_in_minute DESC;

-- Частота срабатывания rate limit за день
WITH rate_limited_users AS (
  SELECT 
    user_id,
    DATE_TRUNC('minute', timestamp) as minute,
    COUNT(*) as requests
  FROM user_requests
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY user_id, DATE_TRUNC('minute', timestamp)
  HAVING COUNT(*) >= 3
)
SELECT COUNT(*) as rate_limit_triggers
FROM rate_limited_users;

-- 7. RETENTION АНАЛИЗ
-- ============================================

-- Возвращаемость пользователей (cohort analysis)
WITH first_request AS (
  SELECT 
    user_id,
    DATE(MIN(timestamp)) as first_date
  FROM user_requests
  GROUP BY user_id
)
SELECT 
  fr.first_date,
  COUNT(DISTINCT fr.user_id) as new_users,
  COUNT(DISTINCT CASE 
    WHEN DATE(ur.timestamp) > fr.first_date 
    THEN fr.user_id 
  END) as returned_users,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN DATE(ur.timestamp) > fr.first_date 
      THEN fr.user_id 
    END) * 100.0 / COUNT(DISTINCT fr.user_id),
    2
  ) as retention_rate
FROM first_request fr
LEFT JOIN user_requests ur ON fr.user_id = ur.user_id
WHERE fr.first_date > NOW() - INTERVAL '30 days'
GROUP BY fr.first_date
ORDER BY fr.first_date DESC;

-- 8. ПРОИЗВОДИТЕЛЬНОСТЬ
-- ============================================

-- Размер таблиц
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_requests', 'search_history', 'download_stats')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Количество записей в таблицах
SELECT 
  'user_requests' as table_name,
  COUNT(*) as row_count,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days') as recent_rows
FROM user_requests
UNION ALL
SELECT 
  'search_history',
  COUNT(*),
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days')
FROM search_history
UNION ALL
SELECT 
  'download_stats',
  COUNT(*),
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days')
FROM download_stats;

-- 9. ЭКСПОРТ ДАННЫХ
-- ============================================

-- Экспорт топ-запросов в CSV-формат
COPY (
  SELECT 
    query,
    COUNT(*) as searches,
    AVG(result_count) as avg_results
  FROM search_history
  WHERE timestamp > NOW() - INTERVAL '30 days'
  GROUP BY query
  ORDER BY searches DESC
  LIMIT 100
) TO '/tmp/top_searches.csv' WITH CSV HEADER;

-- 10. ОЧИСТКА ДАННЫХ
-- ============================================

-- Удалить данные старше 90 дней
DELETE FROM user_requests 
WHERE timestamp < NOW() - INTERVAL '90 days';

DELETE FROM search_history 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Или используй функцию
SELECT cleanup_old_data();

-- 11. МОНИТОРИНГ ЗДОРОВЬЯ
-- ============================================

-- Проверка последней активности
SELECT 
  'Last request' as metric,
  MAX(timestamp) as value,
  EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) / 60 as minutes_ago
FROM user_requests
UNION ALL
SELECT 
  'Requests in last hour',
  COUNT(*)::TEXT,
  NULL
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Проверка ошибок (если логируются)
-- Добавь таблицу error_logs для отслеживания ошибок

-- ============================================
-- DASHBOARD QUERY (для визуализации)
-- ============================================

-- Комплексная статистика для дашборда
SELECT 
  (SELECT COUNT(DISTINCT user_id) FROM user_requests) as total_users,
  (SELECT COUNT(DISTINCT user_id) FROM user_requests WHERE timestamp > NOW() - INTERVAL '24 hours') as daily_active_users,
  (SELECT COUNT(*) FROM user_requests WHERE timestamp > NOW() - INTERVAL '24 hours') as requests_today,
  (SELECT COUNT(*) FROM search_history WHERE timestamp > NOW() - INTERVAL '24 hours') as searches_today,
  (SELECT AVG(result_count) FROM search_history WHERE timestamp > NOW() - INTERVAL '7 days') as avg_search_results,
  (SELECT COUNT(*) FROM search_history WHERE result_count = 0 AND timestamp > NOW() - INTERVAL '7 days') as failed_searches_week;
