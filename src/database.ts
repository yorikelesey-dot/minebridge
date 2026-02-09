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
