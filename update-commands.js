// Обновление команд бота
const https = require('https');

const BOT_TOKEN = '8148378911:AAG6pfj30RKYEyzmOHhuOuiY3WTI_zN3bws';

const commands = [
  { command: 'start', description: 'Главное меню' },
  { command: 'mystats', description: 'Моя статистика' },
  { command: 'channel', description: 'Информация о канале' },
  { command: 'mybot', description: 'Управление своим ботом' }
];

console.log('🔄 Обновляю команды бота...\n');

const url = `https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`;

const postData = JSON.stringify({ commands });

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const response = JSON.parse(data);
    if (response.ok) {
      console.log('✅ Команды обновлены!\n');
      console.log('Команды:');
      commands.forEach(cmd => {
        console.log(`  /${cmd.command} - ${cmd.description}`);
      });
      console.log('\n🎉 Теперь перезапусти бота в Telegram (закрой и открой чат)');
    } else {
      console.error('❌ Ошибка:', response.description);
    }
  });
});

req.write(postData);
req.end();
