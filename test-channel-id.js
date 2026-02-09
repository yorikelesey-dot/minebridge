// Проверка ID канала
const https = require('https');

const BOT_TOKEN = '8148378911:AAG6pfj30RKYEyzmOHhuOuiY3WTI_zN3bws';
const CHANNEL_USERNAME = 'minebridge'; // без @

console.log('🔍 Получаю информацию о канале...\n');

const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${CHANNEL_USERNAME}`;

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const response = JSON.parse(data);
    
    if (response.ok) {
      const chat = response.result;
      console.log('✅ Информация о канале:');
      console.log('ID:', chat.id);
      console.log('Title:', chat.title);
      console.log('Username:', chat.username);
      console.log('Type:', chat.type);
      
      console.log('\n📋 Проверка:');
      console.log('ID в config.ts:', -1003753906519);
      console.log('ID канала:', chat.id);
      
      if (chat.id === -1003753906519) {
        console.log('✅ ID совпадает!');
      } else {
        console.log('❌ ID НЕ совпадает! Обнови config.ts');
      }
    } else {
      console.error('❌ Ошибка:', response.description);
      console.log('\nВозможные причины:');
      console.log('1. Бот не добавлен в канал');
      console.log('2. Бот не администратор канала');
      console.log('3. Неправильный username канала');
    }
  });
}).on('error', (err) => {
  console.error('❌ Ошибка запроса:', err.message);
});
