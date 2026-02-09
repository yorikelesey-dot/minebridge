import { VercelRequest, VercelResponse } from '@vercel/node';
import { bot } from '../src/bot';
import { config } from '../src/config';

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).json({ ok: true });
    } else if (req.method === 'GET') {
      // Установка вебхука
      const webhookUrl = `https://${config.webhookDomain}/api/webhook`;
      await bot.telegram.setWebhook(webhookUrl);
      res.status(200).json({ 
        ok: true, 
        message: 'Webhook set successfully',
        url: webhookUrl 
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
