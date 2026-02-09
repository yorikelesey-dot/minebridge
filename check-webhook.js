// Проверка текущих настроек webhook
const https = require('https');

const BOT_TOKEN = '8148378911:AAG6pfj30RKYEyzmOHhuOuiY3WTI_zN3bws';

console.log('🔍 Проверяю текущие настройки webhook...\n');

const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const response = JSON.parse(data);
    
    if (response.ok) {
      const info = response.result;
      console.log('✅ Webhook информация:');
      console.log('URL:', info.url || 'не установлен');
      console.log('Pending updates:', info.pending_update_count);
      console.log('Allowed updates:', info.allowed_updates || 'все (по умолчанию)');
      console.log('Last error:', info.last_error_message || 'нет ошибок');
      console.log('Last error date:', info.last_error_date ? new Date(info.last_error_date * 1000).toLocaleString() : 'нет');
      
      if (!info.allowed_updates || !info.allowed_updates.includes('channel_post')) {
        console.log('\n⚠️  ПРОБЛЕМА: channel_post не включен в allowed_updates!');
        console.log('Нужно переустановить webhook.');
      } else {
        console.log('\n✅ channel_post включен, всё ок!');
      }
    } else {
      console.error('❌ Ошибка:', response.description);
    }
  });
}).on('error', (err) => {
  console.error('❌ Ошибка запроса:', err.message);
});
