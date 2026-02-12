import { VercelRequest, VercelResponse } from '@vercel/node';
import { bot } from '../dist/bot';
import { config } from '../dist/config';

export default async (req: VercelRequest, res: VercelResponse) => {
  console.log('🔍 WEBHOOK VERSION: 2.2.0 - 10.02.2026 18:40');
  
  try {
    if (req.method === 'POST') {
      // Обрабатываем update с timeout защитой
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Handler timeout')), 25000)
      );
      
      const handlePromise = bot.handleUpdate(req.body);
      
      try {
        await Promise.race([handlePromise, timeoutPromise]);
        res.status(200).json({ ok: true });
      } catch (error: any) {
        // Если timeout или ETIMEDOUT - всё равно отвечаем 200
        if (error.message === 'Handler timeout' || error.code === 'ETIMEDOUT') {
          console.log('⚠️ Timeout, but responding OK to Telegram');
          res.status(200).json({ ok: true });
        } else {
          throw error;
        }
      }
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
