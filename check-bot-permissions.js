// Проверка прав бота в канале
const https = require('https');

const BOT_TOKEN = '8148378911:AAG6pfj30RKYEyzmOHhuOuiY3WTI_zN3bws';
const CHANNEL_ID = -1003753906519;

console.log('🔍 Проверяю права бота в канале...\n');

// Получаем информацию о боте
const botUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;

https.get(botUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const botResponse = JSON.parse(data);
    const botId = botResponse.result.id;
    const botUsername = botResponse.result.username;
    
    console.log('🤖 Бот:', `@${botUsername} (ID: ${botId})`);
    console.log('');
    
    // Проверяем права бота в канале
    const memberUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${botId}`;
    
    https.get(memberUrl, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => { data2 += chunk; });
      res2.on('end', () => {
        const response = JSON.parse(data2);
        
        if (response.ok) {
          const member = response.result;
          console.log('✅ Бот найден в канале');
          console.log('Статус:', member.status);
          console.log('');
          
          if (member.status === 'administrator') {
            console.log('✅ Бот - администратор');
            console.log('');
            console.log('Права:');
            console.log('  can_post_messages:', member.can_post_messages || false);
            console.log('  can_edit_messages:', member.can_edit_messages || false);
            console.log('  can_delete_messages:', member.can_delete_messages || false);
            console.log('  can_manage_chat:', member.can_manage_chat || false);
            
            console.log('');
            if (!member.can_post_messages) {
              console.log('⚠️  ПРОБЛЕМА: Боту нужно право "Post Messages"');
              console.log('Решение: Зайди в настройки канала → Administrators → Редактируй бота → Включи "Post Messages"');
            } else {
              console.log('✅ Все необходимые права есть!');
              console.log('');
              console.log('Если рассылка не работает, проблема в коде.');
              console.log('Проверь логи Vercel: https://vercel.com/dashboard');
            }
          } else {
            console.log('❌ ПРОБЛЕМА: Бот не администратор!');
            console.log('Статус:', member.status);
            console.log('');
            console.log('Решение:');
            console.log('1. Открой канал @minebridge');
            console.log('2. Настройки → Administrators');
            console.log('3. Add Administrator');
            console.log(`4. Найди @${botUsername}`);
            console.log('5. Дай права "Post Messages"');
          }
        } else {
          console.error('❌ Ошибка:', response.description);
          console.log('');
          console.log('Возможные причины:');
          console.log('1. Бот не добавлен в канал');
          console.log('2. Неправильный ID канала');
        }
      });
    });
  });
});
