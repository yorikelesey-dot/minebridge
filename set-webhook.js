// Скрипт для установки webhook
const https = require('https');

const BOT_TOKEN = '8148378911:AAG6pfj30RKYEyzmOHhuOuiY3WTI_zN3bws';
const WEBHOOK_URL = process.argv[2]; // Передаём URL как аргумент

if (!WEBHOOK_URL) {
  console.error('❌ Ошибка: Укажи URL webhook');
  console.log('Использование: node set-webhook.js https://твой-домен.vercel.app/api/webhook');
  process.exit(1);
}

console.log('🔧 Устанавливаю webhook...');
console.log('URL:', WEBHOOK_URL);

const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}`;

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const response = JSON.parse(data);
    
    if (response.ok) {
      console.log('✅ Webhook установлен успешно!');
      console.log('Описание:', response.description);
    } else {
      console.error('❌ Ошибка:', response.description);
    }
  });
}).on('error', (err) => {
  console.error('❌ Ошибка запроса:', err.message);
});
