import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(config.supabaseUrl, config.supabaseKey);

export interface UserRequest {
  user_id: number;
  username?: string;
  request_type: string;
  timestamp: string;
}

export interface SearchHistory {
  user_id: number;
  query: string;
  result_count: number;
  timestamp: string;
}

// Проверка rate limit
export async function checkRateLimit(userId: number): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - config.rateLimitWindow).toISOString();
  
  const { data, error } = await supabase
    .from('user_requests')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', oneMinuteAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    return true; // В случае ошибки разрешаем запрос
  }

  return (data?.length || 0) < config.rateLimitRequests;
}

// Логирование запроса
export async function logRequest(userId: number, username: string | undefined, requestType: string) {
  const { error } = await supabase
    .from('user_requests')
    .insert({
      user_id: userId,
      username,
      request_type: requestType,
      timestamp: new Date().toISOString(),
    });

  if (error) {
    console.error('Log request error:', error);
  }
}

// Сохранение истории поиска
export async function saveSearchHistory(userId: number, query: string, resultCount: number) {
  const { error } = await supabase
    .from('search_history')
    .insert({
      user_id: userId,
      query,
      result_count: resultCount,
      timestamp: new Date().toISOString(),
    });

  if (error) {
    console.error('Save search history error:', error);
  }
}

// Статистика для админа
export async function getStats() {
  try {
    // Общая статистика
    const { data: totalUsers } = await supabase
      .from('user_requests')
      .select('user_id', { count: 'exact', head: true });

    const { data: totalRequests } = await supabase
      .from('user_requests')
      .select('*', { count: 'exact', head: true });

    const { data: totalSearches } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true });

    // Активность за 24 часа
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: activeUsers } = await supabase
      .from('user_requests')
      .select('user_id', { count: 'exact', head: true })
      .gte('timestamp', oneDayAgo);

    const { data: requestsToday } = await supabase
      .from('user_requests')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneDayAgo);

    const { data: searchesToday } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneDayAgo);

    return {
      totalUsers: totalUsers?.length || 0,
      totalRequests: totalRequests?.length || 0,
      totalSearches: totalSearches?.length || 0,
      activeUsersToday: activeUsers?.length || 0,
      requestsToday: requestsToday?.length || 0,
      searchesToday: searchesToday?.length || 0,
    };
  } catch (error) {
    console.error('Get stats error:', error);
    return null;
  }
}

// Топ пользователей
export async function getTopUsers(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('user_requests')
      .select('user_id, username')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // Подсчёт запросов по пользователям
    const userCounts = new Map<number, { username?: string; count: number }>();
    
    data?.forEach((req: any) => {
      const current = userCounts.get(req.user_id) || { username: req.username, count: 0 };
      current.count++;
      userCounts.set(req.user_id, current);
    });

    // Сортировка и возврат топа
    return Array.from(userCounts.entries())
      .map(([userId, data]) => ({ userId, username: data.username, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('Get top users error:', error);
    return [];
  }
}

// Популярные запросы
export async function getPopularSearches(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('query')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // Подсчёт запросов
    const queryCounts = new Map<string, number>();
    
    data?.forEach((search: any) => {
      queryCounts.set(search.query, (queryCounts.get(search.query) || 0) + 1);
    });

    // Сортировка и возврат топа
    return Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('Get popular searches error:', error);
    return [];
  }
}

// Активность по часам
export async function getActivityByHour() {
  try {
    const { data, error } = await supabase
      .from('user_requests')
      .select('timestamp')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const hourCounts = new Array(24).fill(0);
    
    data?.forEach((req: any) => {
      const hour = new Date(req.timestamp).getUTCHours();
      hourCounts[hour]++;
    });

    return hourCounts;
  } catch (error) {
    console.error('Get activity by hour error:', error);
    return new Array(24).fill(0);
  }
}
