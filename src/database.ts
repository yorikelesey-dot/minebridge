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
    // Уникальные пользователи
    const { data: allRequests } = await supabase
      .from('user_requests')
      .select('user_id');

    const uniqueUsers = new Set(allRequests?.map((r: any) => r.user_id) || []).size;

    // Общее количество запросов
    const { count: totalRequests } = await supabase
      .from('user_requests')
      .select('*', { count: 'exact', head: true });

    // Общее количество поисков
    const { count: totalSearches } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true });

    // Активность за 24 часа
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: activeRequestsToday } = await supabase
      .from('user_requests')
      .select('user_id')
      .gte('timestamp', oneDayAgo);

    const activeUsersToday = new Set(activeRequestsToday?.map((r: any) => r.user_id) || []).size;

    const { count: requestsToday } = await supabase
      .from('user_requests')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneDayAgo);

    const { count: searchesToday } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneDayAgo);

    return {
      totalUsers: uniqueUsers,
      totalRequests: totalRequests || 0,
      totalSearches: totalSearches || 0,
      activeUsersToday: activeUsersToday,
      requestsToday: requestsToday || 0,
      searchesToday: searchesToday || 0,
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

// Логирование скачивания
export async function logDownload(userId: number, projectName: string, projectId: string, fileSize: number, source: string) {
  const { error } = await supabase
    .from('download_stats')
    .insert({
      user_id: userId,
      project_name: projectName,
      project_id: projectId,
      file_size: fileSize,
      source,
      timestamp: new Date().toISOString(),
    });

  if (error) {
    console.error('Log download error:', error);
  }
}

// Статистика скачиваний
export async function getDownloadStats() {
  try {
    // Общее количество скачиваний
    const { count: totalDownloads } = await supabase
      .from('download_stats')
      .select('*', { count: 'exact', head: true });

    // Скачивания за 24 часа
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: downloadsToday } = await supabase
      .from('download_stats')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneDayAgo);

    // Популярные моды за неделю
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentDownloads } = await supabase
      .from('download_stats')
      .select('project_name, project_id')
      .gte('timestamp', oneWeekAgo);

    const modCounts = new Map<string, { name: string; count: number }>();
    recentDownloads?.forEach((dl: any) => {
      const current = modCounts.get(dl.project_id) || { name: dl.project_name, count: 0 };
      current.count++;
      modCounts.set(dl.project_id, current);
    });

    const popularMods = Array.from(modCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Средний размер файла
    const { data: allDownloads } = await supabase
      .from('download_stats')
      .select('file_size');

    const totalSize = allDownloads?.reduce((sum: number, dl: any) => sum + dl.file_size, 0) || 0;
    const avgSize = allDownloads?.length ? totalSize / allDownloads.length : 0;

    return {
      totalDownloads: totalDownloads || 0,
      downloadsToday: downloadsToday || 0,
      popularMods,
      avgSize,
      totalSize,
    };
  } catch (error) {
    console.error('Get download stats error:', error);
    return null;
  }
}
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
