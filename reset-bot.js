// Полный сброс бота
const https = require('https');

const BOT_TOKEN = '8148378911:AAG6pfj30RKYEyzmOHhuOuiY3WTI_zN3bws';
const WEBHOOK_URL = 'https://minebridge-elerisey.vercel.app/api/webhook';

console.log('🔄 Сбрасываю бота...\n');

// 1. Удаляем webhook
console.log('1️⃣ Удаляю webhook...');
const deleteUrl = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`;

https.get(deleteUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Webhook удалён\n');
    
    // 2. Ждём 2 секунды
    setTimeout(() => {
      // 3. Устанавливаем webhook заново
      console.log('2️⃣ Устанавливаю webhook заново...');
      const params = {
        url: WEBHOOK_URL,
        allowed_updates: JSON.stringify(['message', 'callback_query', 'inline_query', 'channel_post']),
        drop_pending_updates: true
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const setUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?${queryString}`;
      
      https.get(setUrl, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => { data2 += chunk; });
        res2.on('end', () => {
          const response = JSON.parse(data2);
          if (response.ok) {
            console.log('✅ Webhook установлен!\n');
            console.log('3️⃣ Проверяю...');
            
            // 4. Проверяем
            const infoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
            https.get(infoUrl, (res3) => {
              let data3 = '';
              res3.on('data', (chunk) => { data3 += chunk; });
              res3.on('end', () => {
                const info = JSON.parse(data3);
                console.log('\n✅ Готово!');
                console.log('URL:', info.result.url);
                console.log('Allowed updates:', info.result.allowed_updates);
                console.log('\n🎉 Теперь отправь боту /start - должны появиться новые кнопки!');
              });
            });
          } else {
            console.error('❌ Ошибка:', response.description);
          }
        });
      });
    }, 2000);
  });
});
