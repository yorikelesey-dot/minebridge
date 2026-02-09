import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  curseforgeApiKey: process.env.CURSEFORGE_API_KEY || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',
  webhookDomain: process.env.WEBHOOK_DOMAIN || '',
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  rateLimitRequests: 3,
  rateLimitWindow: 60000, // 1 minute
  adminUserId: 7839251308, // ID администратора
  newsChannelId: -1003753906519, // ID канала с новостями
  newsChannelLink: 'https://t.me/minebridge', // Ссылка на канал
};
