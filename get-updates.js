// Получение последних обновлений (для отладки)
const https = require('https');

const BOT_TOKEN = '8148378911:AAG6pfj30RKYEyzmOHhuOuiY3WTI_zN3bws';

console.log('🔍 Получаю последние обновления...\n');
console.log('⚠️  Это временно отключит webhook!\n');

// Сначала удаляем webhook чтобы получить обновления
const deleteUrl = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`;

https.get(deleteUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Webhook удалён временно');
    
    // Теперь получаем обновления
    const getUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?allowed_updates=["message","channel_post","callback_query"]`;
    
    https.get(getUrl, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => { data2 += chunk; });
      res2.on('end', () => {
        const response = JSON.parse(data2);
        
        if (response.ok) {
          console.log(`\n✅ Получено обновлений: ${response.result.length}\n`);
          
          response.result.forEach((update, i) => {
            console.log(`--- Обновление ${i + 1} ---`);
            console.log('Update ID:', update.update_id);
            
            if (update.message) {
              console.log('Тип: message');
              console.log('От:', update.message.from?.username || update.message.from?.id);
              console.log('Текст:', update.message.text?.substring(0, 50));
            }
            
            if (update.channel_post) {
              console.log('Тип: channel_post ✅');
              console.log('Канал ID:', update.channel_post.chat.id);
              console.log('Канал:', update.channel_post.chat.title);
              console.log('Текст:', update.channel_post.text?.substring(0, 50));
            }
            
            if (update.callback_query) {
              console.log('Тип: callback_query');
              console.log('Data:', update.callback_query.data);
            }
            
            console.log('');
          });
          
          if (response.result.length === 0) {
            console.log('📭 Нет новых обновлений');
            console.log('\nПопробуй:');
            console.log('1. Опубликовать пост в канале');
            console.log('2. Запустить этот скрипт снова');
          }
        } else {
          console.error('❌ Ошибка:', response.description);
        }
        
        // Восстанавливаем webhook
        console.log('\n🔧 Восстанавливаю webhook...');
        const setUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://minebridge-elerisey.vercel.app/api/webhook&allowed_updates=["message","callback_query","inline_query","channel_post"]`;
        
        https.get(setUrl, (res3) => {
          let data3 = '';
          res3.on('data', (chunk) => { data3 += chunk; });
          res3.on('end', () => {
            console.log('✅ Webhook восстановлен');
          });
        });
      });
    });
  });
});
