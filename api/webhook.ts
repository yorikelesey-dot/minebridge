import { VercelRequest, VercelResponse } from '@vercel/node';
import { bot } from '../src/bot';
import { config } from '../src/config';

// Retry функция для обработки timeout
async function handleUpdateWithRetry(update: any, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      await bot.handleUpdate(update);
      return;
    } catch (error: any) {
      const isTimeout = error.code === 'ETIMEDOUT' || error.errno === 'ETIMEDOUT';
      const isLastAttempt = i === maxRetries;
      
      if (isTimeout && !isLastAttempt) {
        console.log(`⚠️ Timeout on attempt ${i + 1}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Ждём 1 секунду
        continue;
      }
      throw error;
    }
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  console.log('🔍 WEBHOOK VERSION: 2.1.0 - 10.02.2026 18:35');
  
  try {
    if (req.method === 'POST') {
      // Отвечаем сразу, чтобы Telegram не ждал
      res.status(200).json({ ok: true });
      
      // Обрабатываем update асинхронно с retry
      handleUpdateWithRetry(req.body).catch(error => {
        console.error('Update handling error:', error);
      });
    } else if (req.method === 'GET') {
      // Установка вебхука с allowed_updates для получения channel_post
      const webhookUrl = `https://${config.webhookDomain}/api/webhook`;
      await bot.telegram.setWebhook(webhookUrl, {
        allowed_updates: [
          'message',
          'callback_query',
          'inline_query',
          'channel_post', // Важно! Для получения постов из канала
        ],
      });
      res.status(200).json({ 
        ok: true, 
        message: 'Webhook set successfully with channel_post updates',
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'inline_query', 'channel_post']
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
