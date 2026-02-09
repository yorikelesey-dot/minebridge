// Установка webhook с правильным URL
const https = require('https');

const BOT_TOKEN = '8148378911:AAG6pfj30RKYEyzmOHhuOuiY3WTI_zN3bws';

// Используем основной домен из Vercel
const WEBHOOK_URL = 'https://minebridge-elerisey.vercel.app/api/webhook';

console.log('🔧 Устанавливаю webhook с правильным URL...');
console.log('URL:', WEBHOOK_URL);

const params = {
  url: WEBHOOK_URL,
  allowed_updates: JSON.stringify(['message', 'callback_query', 'inline_query', 'channel_post'])
};

const queryString = Object.keys(params)
  .map(key => `${key}=${encodeURIComponent(params[key])}`)
  .join('&');

const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?${queryString}`;

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const response = JSON.parse(data);
    
    if (response.ok) {
      console.log('\n✅ Webhook установлен успешно!');
      console.log('Описание:', response.description);
      console.log('\nТеперь проверь:');
      console.log('1. Отправь боту /start');
      console.log('2. Опубликуй пост в канале @minebridge');
      console.log('3. Проверь рассылку');
    } else {
      console.error('\n❌ Ошибка:', response.description);
    }
  });
}).on('error', (err) => {
  console.error('❌ Ошибка запроса:', err.message);
});
