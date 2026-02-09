// Локальная разработка с long polling
import { bot } from './bot';
import { config } from './config';

if (process.env.NODE_ENV !== 'production') {
  console.log('🚀 Starting bot in development mode...');
  
  bot.launch({
    webhook: undefined,
  }).then(() => {
    console.log('✅ Bot started successfully!');
  }).catch((error) => {
    console.error('❌ Failed to start bot:', error);
  });

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  console.log('⚠️ Production mode - use webhook endpoint');
}
