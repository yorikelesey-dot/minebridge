import { VercelRequest, VercelResponse } from '@vercel/node';
import { bot } from '../src/bot';
import { config } from '../src/config';

export default async (req: VercelRequest, res: VercelResponse) => {
  console.log('🔍 WEBHOOK VERSION: 2.0.0 - 10.02.2026 14:30');
  
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).json({ ok: true });
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
