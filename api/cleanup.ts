import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../dist/database';

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Проверка секретного ключа для безопасности
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Starting cleanup...');

    // Удаление старых запросов (старше 7 дней)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: requestsError, count: requestsDeleted } = await supabase
      .from('user_requests')
      .delete()
      .lt('timestamp', sevenDaysAgo);

    if (requestsError) {
      console.error('Error deleting old requests:', requestsError);
    }

    // Удаление старой истории поиска (старше 30 дней)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: historyError, count: historyDeleted } = await supabase
      .from('search_history')
      .delete()
      .lt('timestamp', thirtyDaysAgo);

    if (historyError) {
      console.error('Error deleting old search history:', historyError);
    }

    // Удаление старой статистики скачиваний (старше 90 дней)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error: statsError, count: statsDeleted } = await supabase
      .from('download_stats')
      .delete()
      .lt('timestamp', ninetyDaysAgo);

    if (statsError) {
      console.error('Error deleting old download stats:', statsError);
    }

    console.log('Cleanup completed:', {
      requestsDeleted,
      historyDeleted,
      statsDeleted,
    });

    res.status(200).json({
      ok: true,
      message: 'Cleanup completed successfully',
      deleted: {
        requests: requestsDeleted || 0,
        history: historyDeleted || 0,
        stats: statsDeleted || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
