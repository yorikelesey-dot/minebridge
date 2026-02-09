import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import { mainMenuKeyboard, adminMenuKeyboard, createResultsKeyboard, createVersionsKeyboard, gameVersionKeyboard, loaderKeyboard, statsMenuKeyboard, permanentKeyboard, permanentKeyboardUser } from './keyboards';
import { searchModrinth, getModrinthVersions } from './api/modrinth';
import { searchCurseForge, getCurseForgeFiles } from './api/curseforge';
import { checkRateLimit, logRequest, saveSearchHistory, getStats, getTopUsers, getPopularSearches, getActivityByHour, logDownload, getDownloadStats, createUserBot, getUserBot, deleteUserBot } from './database';
import { downloadFile, formatFileSize, canSendDirectly } from './utils/download';
import { supabase } from './database';

export const bot = new Telegraf(config.telegramToken);

// Хранилище состояний пользователей
interface UserState {
  action: string;
  data?: any;
  projectId?: string;
  projectType?: string;
  gameVersion?: string;
  loader?: string;
  results?: any[];
  currentPage?: number;
  timestamp: number;
}

const userStates = new Map<number, UserState>();

// Хранилище результатов поиска (для пагинации)
interface SearchResults {
  results: any[];
  projectType: string;
  gameVersion?: string;
  loader?: string;
  timestamp: number;
}

const searchResults = new Map<number, SearchResults>();

// Автоочистка старых состояний (старше 1 часа)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  for (const [userId, state] of userStates.entries()) {
    if (state.timestamp < oneHourAgo) {
      userStates.delete(userId);
    }
  }
  
  for (const [userId, search] of searchResults.entries()) {
    if (search.timestamp < oneHourAgo) {
      searchResults.delete(userId);
    }
  }
  
  // Логирование размера Map
  if (userStates.size > 0 || searchResults.size > 0) {
    console.log(`Active states: ${userStates.size}, Active searches: ${searchResults.size}`);
  }
}, 10 * 60 * 1000); // Каждые 10 минут

// Функция для установки состояния с timestamp
function setUserState(userId: number, state: Omit<UserState, 'timestamp'>) {
  userStates.set(userId, { ...state, timestamp: Date.now() });
}

// Команда /start
bot.command('start', async (ctx) => {
  console.log('🔍 BOT VERSION: 2.0.0 - 10.02.2026 14:30');
  
  const isAdmin = ctx.from?.id === config.adminUserId;
  const keyboard = isAdmin ? adminMenuKeyboard : mainMenuKeyboard;
  const permKeyboard = isAdmin ? permanentKeyboard : permanentKeyboardUser;
  
  await ctx.reply(
    '👋 Привет! Я бот для поиска и скачивания модов Minecraft.\n\n' +
    '🔍 Выбери категорию или используй поиск:\n' +
    '• 🔧 Моды\n' +
    '• ✨ Шейдеры\n' +
    '• 🎨 Ресурспаки\n\n' +
    `📢 Подпишись на наш канал для новостей: ${config.newsChannelLink}\n\n` +
    `🤖 Версия: 2.0.0`,
    { 
      ...keyboard, 
      ...permKeyboard
    }
  );
});

// Команда /channel - ссылка на канал
bot.command('channel', async (ctx) => {
  await ctx.reply(
    '📢 Наш новостной канал\n\n' +
    'Здесь ты найдёшь:\n' +
    '• 🆕 Новые моды и обновления\n' +
    '• 📰 Новости Minecraft\n' +
    '• 💡 Полезные советы\n' +
    '• 🎮 Интересные сборки\n\n' +
    `Подписывайся: ${config.newsChannelLink}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Подписаться на канал', url: config.newsChannelLink }],
          [{ text: '« Главное меню', callback_data: 'main_menu' }]
        ]
      }
    }
  );
});

// Команда /mybot - управление своим ботом
bot.command('mybot', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userBot = await getUserBot(userId);

  if (!userBot) {
    return ctx.reply(
      '❌ У тебя нет бота.\n\n' +
      'Создай своего бота с помощью кнопки "🤖 Создать бота"',
      mainMenuKeyboard
    );
  }

  await ctx.reply(
    `🤖 Твой бот\n\n` +
    `Имя: ${userBot.bot_name}\n` +
    `Username: @${userBot.bot_username}\n` +
    `Статус: ${userBot.is_active ? '✅ Активен' : '❌ Неактивен'}\n` +
    `Создан: ${new Date(userBot.created_at).toLocaleDateString('ru-RU')}\n\n` +
    `⚙️ Управление:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🤖 Открыть бота', url: `https://t.me/${userBot.bot_username}` }],
          [{ text: '🗑️ Удалить бота', callback_data: 'delete_my_bot' }],
          [{ text: '« Назад', callback_data: 'main_menu' }]
        ]
      }
    }
  );
});

// Обработчик удаления бота
bot.action('delete_my_bot', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await ctx.answerCbQuery();

  await ctx.editMessageText(
    '⚠️ Удаление бота\n\n' +
    'Ты уверен? Это действие нельзя отменить.\n\n' +
    'После удаления ты сможешь создать нового бота.',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Да, удалить', callback_data: 'confirm_delete_bot' }],
          [{ text: '❌ Отмена', callback_data: 'main_menu' }]
        ]
      }
    }
  );
});

// Подтверждение удаления
bot.action('confirm_delete_bot', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await ctx.answerCbQuery('⏳ Удаляю...');

  const success = await deleteUserBot(userId);

  if (success) {
    await ctx.editMessageText(
      '✅ Бот успешно удалён!\n\n' +
      'Теперь ты можешь создать нового бота.',
      mainMenuKeyboard
    );
  } else {
    await ctx.editMessageText(
      '❌ Ошибка при удалении бота.\n\n' +
      'Попробуй позже или обратись к @elerisey',
      mainMenuKeyboard
    );
  }
});

// Команда /mystats - личная статистика
bot.command('mystats', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Получаем статистику пользователя
    const { data: requests } = await supabase
      .from('user_requests')
      .select('*')
      .eq('user_id', userId);

    const { data: searches } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId);

    const { data: downloads } = await supabase
      .from('download_stats')
      .select('*')
      .eq('user_id', userId);

    // Подсчёт категорий
    const categories = new Map<string, number>();
    requests?.forEach((req: any) => {
      const type = req.request_type.replace('search_', '');
      categories.set(type, (categories.get(type) || 0) + 1);
    });

    const topCategory = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])[0];

    let message = '📊 Твоя статистика\n\n';
    message += `📈 Всего запросов: ${requests?.length || 0}\n`;
    message += `🔍 Поисков: ${searches?.length || 0}\n`;
    message += `📥 Скачиваний: ${downloads?.length || 0}\n\n`;
    
    if (topCategory) {
      const categoryNames: Record<string, string> = {
        mod: '🔧 Моды',
        shader: '✨ Шейдеры',
        resourcepack: '🎨 Ресурспаки',
      };
      message += `❤️ Любимая категория: ${categoryNames[topCategory[0]] || topCategory[0]}\n`;
    }

    // Последние поиски
    if (searches && searches.length > 0) {
      message += '\n🔎 Последние поиски:\n';
      searches.slice(-5).reverse().forEach((search: any) => {
        message += `• ${search.query}\n`;
      });
    }

    await ctx.reply(message, mainMenuKeyboard);
  } catch (error) {
    console.error('MyStats error:', error);
    await ctx.reply('❌ Ошибка загрузки статистики');
  }
});

// Главное меню
bot.action('main_menu', async (ctx) => {
  const isAdmin = ctx.from?.id === config.adminUserId;
  const keyboard = isAdmin ? adminMenuKeyboard : mainMenuKeyboard;
  
  await ctx.editMessageText(
    '🏠 Главное меню\n\nВыбери категорию или используй поиск:',
    keyboard
  );
});

// О авторах
bot.action('about_authors', async (ctx) => {
  await ctx.answerCbQuery();
  
  await ctx.editMessageText(
    '👥 О проекте MineBridge\n\n' +
    '🤖 Бот для поиска и скачивания модов Minecraft\n\n' +
    '👨‍💻 Разработчики:\n' +
    '• @elerisey - Главный разработчик\n' +
    `• ${config.newsChannelLink} - Новостной канал\n\n` +
    '💡 Возможности:\n' +
    '• Поиск в Modrinth и CurseForge\n' +
    '• Фильтры по версии и загрузчику\n' +
    '• Автоматическое скачивание\n' +
    '• Создание своих ботов\n\n' +
    '📝 Этот бот работает на коде MineBridge.\n' +
    '⚠️ Описание и авторство нельзя изменить.',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Наш канал', url: config.newsChannelLink }],
          [{ text: '👨‍💻 Связаться с админом', url: 'https://t.me/elerisey' }],
          [{ text: '« Назад', callback_data: 'main_menu' }]
        ]
      }
    }
  );
});

// Обработка кнопок постоянной клавиатуры
bot.hears('🏠 Главное меню', async (ctx) => {
  const isAdmin = ctx.from?.id === config.adminUserId;
  const keyboard = isAdmin ? adminMenuKeyboard : mainMenuKeyboard;
  
  await ctx.reply(
    '🏠 Главное меню\n\nВыбери категорию или используй поиск:',
    keyboard
  );
});

bot.hears('🔧 Моды', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.reply('⏳ Слишком много запросов. Подожди минуту.');
  }

  setUserState(userId, { action: 'select_version', projectType: 'mod' });
  await ctx.reply('🎮 Выбери версию Minecraft:', gameVersionKeyboard);
  await logRequest(userId, ctx.from?.username, 'search_mod');
});

bot.hears('✨ Шейдеры', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.reply('⏳ Слишком много запросов. Подожди минуту.');
  }

  setUserState(userId, { action: 'select_version', projectType: 'shader' });
  await ctx.reply('🎮 Выбери версию Minecraft:', gameVersionKeyboard);
  await logRequest(userId, ctx.from?.username, 'search_shader');
});

bot.hears('🎨 Ресурспаки', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.reply('⏳ Слишком много запросов. Подожди минуту.');
  }

  setUserState(userId, { action: 'select_version', projectType: 'resourcepack' });
  await ctx.reply('🎮 Выбери версию Minecraft:', gameVersionKeyboard);
  await logRequest(userId, ctx.from?.username, 'search_resourcepack');
});

bot.hears('🔍 Поиск', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.reply('⏳ Слишком много запросов. Подожди минуту.');
  }

  setUserState(userId, { action: 'search_custom' });
  await ctx.reply('🔍 Введи запрос для поиска:');
  await logRequest(userId, ctx.from?.username, 'search_custom');
});

bot.hears('📊 Статистика', async (ctx) => {
  const userId = ctx.from?.id;
  if (userId !== config.adminUserId) {
    return ctx.reply('❌ Доступ запрещён');
  }

  await ctx.reply(
    '📊 Статистика бота\n\nВыбери раздел:',
    statsMenuKeyboard
  );
});

bot.hears('📈 Моя статистика', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    // Получаем статистику пользователя
    const { data: requests } = await supabase
      .from('user_requests')
      .select('*')
      .eq('user_id', userId);

    const { data: searches } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId);

    const { data: downloads } = await supabase
      .from('download_stats')
      .select('*')
      .eq('user_id', userId);

    // Подсчёт категорий
    const categories = new Map<string, number>();
    requests?.forEach((req: any) => {
      const type = req.request_type.replace('search_', '');
      categories.set(type, (categories.get(type) || 0) + 1);
    });

    const topCategory = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])[0];

    let message = '📈 Твоя статистика\n\n';
    message += `📊 Всего запросов: ${requests?.length || 0}\n`;
    message += `🔍 Поисков: ${searches?.length || 0}\n`;
    message += `📥 Скачиваний: ${downloads?.length || 0}\n\n`;
    
    if (topCategory) {
      const categoryNames: Record<string, string> = {
        mod: '🔧 Моды',
        shader: '✨ Шейдеры',
        resourcepack: '🎨 Ресурспаки',
      };
      message += `❤️ Любимая категория: ${categoryNames[topCategory[0]] || topCategory[0]}\n`;
    }

    // Последние поиски
    if (searches && searches.length > 0) {
      message += '\n🔎 Последние поиски:\n';
      searches.slice(-5).reverse().forEach((search: any) => {
        message += `• ${search.query}\n`;
      });
    }

    await ctx.reply(message);
  } catch (error) {
    console.error('MyStats error:', error);
    await ctx.reply('❌ Ошибка загрузки статистики');
  }
});

bot.hears('📢 Канал', async (ctx) => {
  await ctx.reply(
    '📢 Наш новостной канал\n\n' +
    'Здесь ты найдёшь:\n' +
    '• 🆕 Новые моды и обновления\n' +
    '• 📰 Новости Minecraft\n' +
    '• 💡 Полезные советы\n' +
    '• 🎮 Интересные сборки\n\n' +
    `Подписывайся: ${config.newsChannelLink}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Подписаться на канал', url: config.newsChannelLink }]
        ]
      }
    }
  );
});

bot.hears('🤖 Создать бота', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Проверяем есть ли уже бот
  const existingBot = await getUserBot(userId);
  
  if (existingBot) {
    await ctx.reply(
      `🤖 У тебя уже есть бот!\n\n` +
      `Имя: ${existingBot.bot_name}\n` +
      `Username: @${existingBot.bot_username}\n` +
      `Статус: ${existingBot.is_active ? '✅ Активен' : '❌ Неактивен'}\n\n` +
      `Хочешь удалить и создать нового?`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🗑️ Удалить бота', callback_data: 'delete_my_bot' }],
            [{ text: '« Назад', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    return;
  }

  setUserState(userId, { action: 'create_bot_token' });
  
  await ctx.reply(
    '🤖 Создание своего бота\n\n' +
    '1️⃣ Открой @BotFather в Telegram\n' +
    '2️⃣ Отправь команду /newbot\n' +
    '3️⃣ Следуй инструкциям BotFather\n' +
    '4️⃣ Скопируй токен бота\n' +
    '5️⃣ Отправь токен мне\n\n' +
    '⚠️ Токен выглядит так:\n' +
    '`1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`\n\n' +
    '❗ Твой бот будет работать с нашим кодом и брендингом.\n' +
    '❗ Максимум 1 бот на пользователя.',
    { parse_mode: 'Markdown' }
  );
});

// Обработка поиска модов
bot.action('search_mod', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  setUserState(userId, { action: 'select_version', projectType: 'mod' });
  await ctx.editMessageText('🎮 Выбери версию Minecraft:', gameVersionKeyboard);
  await logRequest(userId, ctx.from?.username, 'search_mod');
});

// Обработка поиска шейдеров
bot.action('search_shader', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  setUserState(userId, { action: 'select_version', projectType: 'shader' });
  await ctx.editMessageText('🎮 Выбери версию Minecraft:', gameVersionKeyboard);
  await logRequest(userId, ctx.from?.username, 'search_shader');
});

// Обработка поиска ресурспаков
bot.action('search_resourcepack', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  setUserState(userId, { action: 'select_version', projectType: 'resourcepack' });
  await ctx.editMessageText('🎮 Выбери версию Minecraft:', gameVersionKeyboard);
  await logRequest(userId, ctx.from?.username, 'search_resourcepack');
});

// Кастомный поиск
bot.action('search_custom', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  setUserState(userId, { action: 'search_custom' });
  await ctx.editMessageText('🔍 Введи запрос для поиска:');
  await logRequest(userId, ctx.from?.username, 'search_custom');
});

// Выбор версии игры
bot.action(/version_(.+)/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const version = ctx.match[1];
  const state = userStates.get(userId);
  
  if (!state) return;

  if (version === 'custom') {
    state.action = 'input_version';
    setUserState(userId, state);
    await ctx.editMessageText('✏️ Введи версию Minecraft (например: 1.20.1):');
    return;
  }

  state.gameVersion = version === 'any' ? undefined : version;
  state.action = 'select_loader';
  setUserState(userId, state);

  await ctx.editMessageText('⚙️ Выбери загрузчик модов:', loaderKeyboard);
});

// Выбор загрузчика
bot.action(/loader_(.+)/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const loader = ctx.match[1];
  const state = userStates.get(userId);
  
  if (!state) return;

  if (loader === 'custom') {
    state.action = 'input_loader';
    setUserState(userId, state);
    await ctx.editMessageText('✏️ Введи название загрузчика (например: forge, fabric, quilt):');
    return;
  }

  state.loader = loader === 'any' ? undefined : loader;
  state.action = 'search_input';
  setUserState(userId, state);

  const typeText = state.projectType === 'mod' ? 'мода' : 
                   state.projectType === 'shader' ? 'шейдера' : 'ресурспака';
  
  let filterText = '';
  if (state.gameVersion) filterText += `\n🎮 Версия: ${state.gameVersion}`;
  if (state.loader) filterText += `\n⚙️ Загрузчик: ${state.loader}`;

  await ctx.editMessageText(`🔍 Введи название ${typeText} для поиска:${filterText}`);
});

// Обработка текстовых сообщений (поиск)
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = userStates.get(userId);
  if (!state) return;

  const text = ctx.message.text;

  // Обработка создания бота
  if (state.action === 'create_bot_token') {
    // Проверка формата токена
    const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
    if (!tokenRegex.test(text)) {
      return ctx.reply(
        '❌ Неправильный формат токена!\n\n' +
        'Токен должен выглядеть так:\n' +
        '`1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`\n\n' +
        'Попробуй ещё раз или отправь /start для отмены.',
        { parse_mode: 'Markdown' }
      );
    }

    await ctx.reply('⏳ Проверяю токен и создаю бота...');

    try {
      // Проверяем токен через Telegram API
      const axios = require('axios');
      const botInfoResponse = await axios.get(`https://api.telegram.org/bot${text}/getMe`);
      
      if (!botInfoResponse.data.ok) {
        return ctx.reply('❌ Неверный токен! Проверь и попробуй снова.');
      }

      const botInfo = botInfoResponse.data.result;
      const botUsername = botInfo.username;
      const botName = botInfo.first_name;

      // Сохраняем в БД
      const userBot = await createUserBot(userId, text, botUsername, botName);

      if (!userBot) {
        return ctx.reply('❌ Ошибка создания бота. Возможно у тебя уже есть бот.');
      }

      userStates.delete(userId);

      await ctx.reply(
        `✅ Бот успешно создан!\n\n` +
        `🤖 Имя: ${botName}\n` +
        `👤 Username: @${botUsername}\n\n` +
        `📝 Что дальше:\n` +
        `1. Найди @${botUsername} в Telegram\n` +
        `2. Отправь /start\n` +
        `3. Бот работает с нашим кодом!\n\n` +
        `⚠️ Важно:\n` +
        `• Описание и команды нельзя изменить\n` +
        `• Бот содержит информацию об авторах\n` +
        `• Максимум 1 бот на пользователя\n\n` +
        `📊 Управление: /mybot`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🤖 Открыть бота', url: `https://t.me/${botUsername}` }],
              [{ text: '« Главное меню', callback_data: 'main_menu' }]
            ]
          }
        }
      );

      // Логируем создание
      await logRequest(userId, ctx.from?.username, 'create_bot');

    } catch (error: any) {
      console.error('Create bot error:', error);
      await ctx.reply(
        '❌ Ошибка при создании бота.\n\n' +
        'Возможные причины:\n' +
        '• Неверный токен\n' +
        '• Токен уже используется\n' +
        '• Проблемы с Telegram API\n\n' +
        'Попробуй ещё раз или обратись к @elerisey'
      );
    }
    return;
  }

  // Обработка кастомного ввода версии
  if (state.action === 'input_version') {
    state.gameVersion = text.trim();
    state.action = 'select_loader';
    setUserState(userId, state);
    
    await ctx.reply(`✅ Версия установлена: ${text}\n\n⚙️ Теперь выбери загрузчик:`, loaderKeyboard);
    return;
  }

  // Обработка кастомного ввода загрузчика
  if (state.action === 'input_loader') {
    state.loader = text.trim().toLowerCase();
    state.action = 'search_input';
    setUserState(userId, state);
    
    const typeText = state.projectType === 'mod' ? 'мода' : 
                     state.projectType === 'shader' ? 'шейдера' : 'ресурспака';
    
    let filterText = '';
    if (state.gameVersion) filterText += `\n🎮 Версия: ${state.gameVersion}`;
    if (state.loader) filterText += `\n⚙️ Загрузчик: ${state.loader}`;

    await ctx.reply(`✅ Загрузчик установлен: ${text}\n\n🔍 Введи название ${typeText} для поиска:${filterText}`);
    return;
  }

  // Обработка поиска
  if (state.action !== 'search_input' && state.action !== 'search_custom') {
    return;
  }

  const query = text;
  
  await ctx.reply('🔎 Ищу...');

  let projectType = 'mod';
  if (state.projectType === 'shader') projectType = 'shader';
  if (state.projectType === 'resourcepack') projectType = 'resourcepack';

  // Поиск в Modrinth и CurseForge
  const modrinthResults = await searchModrinth(query, projectType);
  
  // Поиск в CurseForge (если есть API ключ)
  let curseforgeResults: any[] = [];
  if (config.curseforgeApiKey) {
    const classId = projectType === 'mod' ? 6 : projectType === 'shader' ? 6552 : 12;
    curseforgeResults = await searchCurseForge(query, classId);
  }
  
  // Объединяем результаты (приоритет Modrinth)
  let results = modrinthResults;

  // Фильтрация по версии и загрузчику
  if (state.gameVersion || state.loader) {
    const versions = await Promise.all(
      results.map(async (item) => {
        const vers = await getModrinthVersions(item.project_id);
        return { item, versions: vers };
      })
    );

    results = versions
      .filter(({ versions: vers }) => {
        return vers.some((v) => {
          const versionMatch = !state.gameVersion || v.game_versions.includes(state.gameVersion);
          const loaderMatch = !state.loader || v.loaders.map(l => l.toLowerCase()).includes(state.loader.toLowerCase());
          return versionMatch && loaderMatch;
        });
      })
      .map(({ item }) => item);
  }

  if (results.length === 0) {
    let filterInfo = '';
    if (state.gameVersion) filterInfo += `\n🎮 Версия: ${state.gameVersion}`;
    if (state.loader) filterInfo += `\n⚙️ Загрузчик: ${state.loader}`;
    
    await ctx.reply(
      `😔 Ничего не найдено в Modrinth.${filterInfo}\n\n` +
      `Попробуй другой запрос или измени фильтры.`,
      mainMenuKeyboard
    );
    userStates.delete(userId);
    return;
  }

  await saveSearchHistory(userId, query, results.length);

  // Сохраняем результаты для пагинации
  searchResults.set(userId, {
    results,
    projectType,
    gameVersion: state.gameVersion,
    loader: state.loader,
    timestamp: Date.now(),
  });

  const page = 0;
  const itemsPerPage = 5;
  const totalPages = Math.ceil(results.length / itemsPerPage);

  let message = `📦 Найдено результатов: ${results.length}\n`;
  if (state.gameVersion) message += `🎮 Версия: ${state.gameVersion}\n`;
  if (state.loader) message += `⚙️ Загрузчик: ${state.loader}\n`;
  if (totalPages > 1) message += `📄 Страница: ${page + 1}/${totalPages}\n`;
  message += '\n';
  
  results.slice(0, itemsPerPage).forEach((item, index) => {
    message += `${index + 1}. ${item.title}\n`;
    message += `   📥 ${item.downloads} загрузок\n`;
    message += `   ${item.description.substring(0, 60)}...\n\n`;
  });

  await ctx.reply(message, createResultsKeyboard(results, 'modrinth', projectType, page));
  userStates.delete(userId);
});

// Выбор проекта из результатов
bot.action(/select_modrinth_(.+)_(.+)/, async (ctx) => {
  const match = ctx.match;
  const projectId = match[2];

  await ctx.answerCbQuery('⏳ Загружаю версии...');

  const versions = await getModrinthVersions(projectId);

  if (versions.length === 0) {
    return ctx.editMessageText('😔 Версии не найдены.', mainMenuKeyboard);
  }

  // Получаем slug проекта для ссылки
  const search = searchResults.get(ctx.from?.id || 0);
  const project = search?.results.find((r: any) => r.project_id === projectId);
  const projectSlug = project?.slug;

  let message = '📋 Доступные версии:\n\n';
  versions.slice(0, 5).forEach((version, index) => {
    message += `${index + 1}. ${version.version_number}\n`;
    message += `   🎮 ${version.game_versions.join(', ')}\n`;
    message += `   ⚙️ ${version.loaders.join(', ')}\n\n`;
  });

  await ctx.editMessageText(message, createVersionsKeyboard(versions, 'modrinth', projectId, projectSlug));
});

// Выбор проекта из CurseForge
bot.action(/select_curseforge_(.+)_(.+)/, async (ctx) => {
  const match = ctx.match;
  const projectId = match[2];

  await ctx.answerCbQuery('⏳ Загружаю версии...');

  const files = await getCurseForgeFiles(parseInt(projectId));

  if (files.length === 0) {
    return ctx.editMessageText('😔 Файлы не найдены.', mainMenuKeyboard);
  }

  let message = '📋 Доступные версии (CurseForge):\n\n';
  files.slice(0, 5).forEach((file, index) => {
    message += `${index + 1}. ${file.displayName}\n`;
    message += `   🎮 ${file.gameVersions.join(', ')}\n`;
    message += `   📦 ${formatFileSize(file.fileLength)}\n\n`;
  });

  await ctx.editMessageText(message, createVersionsKeyboard(files, 'curseforge', projectId));
});

// Скачивание файла
bot.action(/download_modrinth_(.+)_(.+)/, async (ctx) => {
  const match = ctx.match;
  const versionId = match[2];

  await ctx.answerCbQuery('⏳ Подготавливаю файл...');

  try {
    const versions = await getModrinthVersions(match[1]);
    const version = versions.find(v => v.id === versionId);

    if (!version || version.files.length === 0) {
      return ctx.reply('❌ Файл не найден.', mainMenuKeyboard);
    }

    const file = version.files[0];
    const fileSize = file.size;
    const userId = ctx.from?.id;

    if (canSendDirectly(fileSize)) {
      await ctx.reply(`📥 Скачиваю файл (${formatFileSize(fileSize)})...`);
      
      const buffer = await downloadFile(file.url);
      
      if (buffer) {
        await ctx.replyWithDocument(
          { source: buffer, filename: file.filename },
          {
            caption: `✅ ${version.name}\n📦 ${formatFileSize(fileSize)}\n🎮 ${version.game_versions.join(', ')}`,
            ...mainMenuKeyboard
          }
        );
        
        // Логирование скачивания
        if (userId) {
          await logDownload(userId, version.name, match[1], fileSize, 'modrinth');
        }
      } else {
        await ctx.reply(`❌ Ошибка скачивания. Вот прямая ссылка:\n${file.url}`, mainMenuKeyboard);
      }
    } else {
      await ctx.reply(
        `📦 ${version.name}\n` +
        `📏 Размер: ${formatFileSize(fileSize)} (больше 50 МБ)\n\n` +
        `⬇️ Прямая ссылка для скачивания:\n${file.url}`,
        mainMenuKeyboard
      );
      
      // Логирование скачивания (по ссылке)
      if (userId) {
        await logDownload(userId, version.name, match[1], fileSize, 'modrinth');
      }
    }
  } catch (error) {
    console.error('Download error:', error);
    await ctx.reply('❌ Произошла ошибка при скачивании.', mainMenuKeyboard);
  }
});

// Скачивание файла из CurseForge
bot.action(/download_curseforge_(.+)_(.+)/, async (ctx) => {
  const match = ctx.match;
  const modId = parseInt(match[1]);
  const fileId = parseInt(match[2]);

  await ctx.answerCbQuery('⏳ Подготавливаю файл...');

  try {
    const files = await getCurseForgeFiles(modId);
    const file = files.find(f => f.id === fileId);

    if (!file || !file.downloadUrl) {
      return ctx.reply('❌ Файл не найден или недоступен для скачивания.', mainMenuKeyboard);
    }

    const fileSize = file.fileLength;
    const userId = ctx.from?.id;

    if (canSendDirectly(fileSize)) {
      await ctx.reply(`📥 Скачиваю файл (${formatFileSize(fileSize)})...`);
      
      const buffer = await downloadFile(file.downloadUrl);
      
      if (buffer) {
        await ctx.replyWithDocument(
          { source: buffer, filename: file.fileName },
          {
            caption: `✅ ${file.displayName}\n📦 ${formatFileSize(fileSize)}\n🎮 ${file.gameVersions.join(', ')}\n\n🔗 CurseForge`,
            ...mainMenuKeyboard
          }
        );
        
        if (userId) {
          await logDownload(userId, file.displayName, modId.toString(), fileSize, 'curseforge');
        }
      } else {
        await ctx.reply(`❌ Ошибка скачивания. Вот прямая ссылка:\n${file.downloadUrl}`, mainMenuKeyboard);
      }
    } else {
      await ctx.reply(
        `📦 ${file.displayName}\n` +
        `📏 Размер: ${formatFileSize(fileSize)} (больше 50 МБ)\n\n` +
        `⬇️ Прямая ссылка для скачивания:\n${file.downloadUrl}`,
        mainMenuKeyboard
      );
      
      if (userId) {
        await logDownload(userId, file.displayName, modId.toString(), fileSize, 'curseforge');
      }
    }
  } catch (error) {
    console.error('CurseForge download error:', error);
    await ctx.reply('❌ Произошла ошибка при скачивании.', mainMenuKeyboard);
  }
});
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Произошла ошибка. Попробуй позже.', mainMenuKeyboard);
});

// Пересылка новостей из канала
bot.on('channel_post', async (ctx) => {
  console.log('📢 Received channel_post update:', {
    chatId: ctx.channelPost.chat.id,
    chatTitle: ctx.channelPost.chat.title,
    messageId: ctx.channelPost.message_id
  });
  
  if (ctx.channelPost.chat.id === config.newsChannelId) {
    try {
      console.log('📢 New post from news channel, broadcasting to users...');
      
      // Получаем всех уникальных пользователей
      const { data: users, error: usersError } = await supabase
        .from('user_requests')
        .select('user_id')
        .order('timestamp', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }

      const uniqueUsers = [...new Set(users?.map((u: any) => u.user_id) || [])];
      console.log(`Found ${uniqueUsers.length} unique users`);

      let successCount = 0;
      let failCount = 0;

      // Отправляем новость всем пользователям
      for (const userId of uniqueUsers) {
        try {
          // Пересылаем сообщение из канала
          await ctx.telegram.forwardMessage(userId, config.newsChannelId, ctx.channelPost.message_id);
          
          // Добавляем ссылку на канал под новостью
          await ctx.telegram.sendMessage(
            userId,
            `📢 Больше новостей в нашем канале: ${config.newsChannelLink}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📢 Подписаться на канал', url: config.newsChannelLink }]
                ]
              }
            }
          );
          
          successCount++;
          
          // Задержка чтобы не словить rate limit от Telegram (30 сообщений в секунду)
          await new Promise(resolve => setTimeout(resolve, 35));
        } catch (error: any) {
          failCount++;
          // Логируем только если это не блокировка бота пользователем
          if (error.response?.error_code !== 403) {
            console.error(`Failed to send to ${userId}:`, error.response?.description || error.message);
          }
        }
      }

      console.log(`✅ News broadcast completed: ${successCount} sent, ${failCount} failed`);
      
      // Логируем статистику рассылки
      await supabase.from('user_requests').insert({
        user_id: config.adminUserId,
        username: 'system',
        request_type: 'news_broadcast',
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('News broadcast error:', error);
    }
  }
});

// Inline режим - поиск модов прямо из чата
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  
  if (!query || query.length < 2) {
    return ctx.answerInlineQuery([]);
  }

  try {
    const results = await searchModrinth(query, 'mod');
    
    const inlineResults = results.slice(0, 10).map((mod) => ({
      type: 'article' as const,
      id: mod.project_id,
      title: mod.title,
      description: `📥 ${mod.downloads} загрузок | ${mod.description.substring(0, 100)}...`,
      thumb_url: mod.icon_url,
      input_message_content: {
        message_text: 
          `🔧 ${mod.title}\n\n` +
          `📝 ${mod.description}\n\n` +
          `📥 Загрузок: ${mod.downloads}\n` +
          `🔗 Ссылка: https://modrinth.com/mod/${mod.slug}\n\n` +
          `🤖 Найдено через @${ctx.botInfo.username}`,
      },
    }));

    await ctx.answerInlineQuery(inlineResults, {
      cache_time: 300,
      is_personal: false,
    });
  } catch (error) {
    console.error('Inline query error:', error);
    await ctx.answerInlineQuery([]);
  }
});

// Пагинация результатов
bot.action(/page_modrinth_(.+)_(\d+)/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const projectType = ctx.match[1];
  const page = parseInt(ctx.match[2]);

  const search = searchResults.get(userId);
  if (!search) {
    return ctx.answerCbQuery('⏳ Результаты устарели. Сделай новый поиск.');
  }

  const itemsPerPage = 5;
  const totalPages = Math.ceil(search.results.length / itemsPerPage);
  const start = page * itemsPerPage;

  let message = `📦 Найдено результатов: ${search.results.length}\n`;
  if (search.gameVersion) message += `🎮 Версия: ${search.gameVersion}\n`;
  if (search.loader) message += `⚙️ Загрузчик: ${search.loader}\n`;
  if (totalPages > 1) message += `📄 Страница: ${page + 1}/${totalPages}\n`;
  message += '\n';

  search.results.slice(start, start + itemsPerPage).forEach((item, index) => {
    message += `${start + index + 1}. ${item.title}\n`;
    message += `   📥 ${item.downloads} загрузок\n`;
    message += `   ${item.description.substring(0, 60)}...\n\n`;
  });

  await ctx.editMessageText(message, createResultsKeyboard(search.results, 'modrinth', projectType, page));
  await ctx.answerCbQuery();
});

// Заглушка для кнопки с номером страницы
bot.action('noop', async (ctx) => {
  await ctx.answerCbQuery();
});

// Админ-панель: Статистика
bot.action('admin_stats', async (ctx) => {
  const userId = ctx.from?.id;
  if (userId !== config.adminUserId) {
    return ctx.answerCbQuery('❌ Доступ запрещён');
  }

  await ctx.editMessageText(
    '📊 Статистика бота\n\nВыбери раздел:',
    statsMenuKeyboard
  );
});

// Статистика: Пользователи
bot.action('stats_users', async (ctx) => {
  const userId = ctx.from?.id;
  if (userId !== config.adminUserId) {
    return ctx.answerCbQuery('❌ Доступ запрещён');
  }

  await ctx.answerCbQuery('⏳ Загружаю...');

  try {
    const stats = await getStats();
    const topUsers = await getTopUsers(10);

    console.log('Stats:', stats);
    console.log('Top users:', topUsers);

    if (!stats) {
      return ctx.editMessageText('❌ Ошибка загрузки статистики', statsMenuKeyboard);
    }

    let message = '👥 Статистика пользователей\n\n';
    message += `📊 Всего пользователей: ${stats.totalUsers}\n`;
    message += `🔥 Активных за 24ч: ${stats.activeUsersToday}\n`;
    message += `📈 Всего запросов: ${stats.totalRequests}\n`;
    message += `📅 Запросов за 24ч: ${stats.requestsToday}\n\n`;
    
    if (topUsers.length > 0) {
      message += '🏆 Топ-10 пользователей (за неделю):\n\n';
      topUsers.forEach((user, index) => {
        const username = user.username ? `@${user.username}` : `ID: ${user.userId}`;
        message += `${index + 1}. ${username} - ${user.count} запросов\n`;
      });
    } else {
      message += '📭 Пока нет данных о пользователях';
    }

    await ctx.editMessageText(message, statsMenuKeyboard);
  } catch (error) {
    console.error('Stats error:', error);
    await ctx.editMessageText('❌ Ошибка: ' + (error as Error).message, statsMenuKeyboard);
  }
});

// Статистика: Поиски
bot.action('stats_searches', async (ctx) => {
  const userId = ctx.from?.id;
  if (userId !== config.adminUserId) {
    return ctx.answerCbQuery('❌ Доступ запрещён');
  }

  await ctx.answerCbQuery('⏳ Загружаю...');

  const stats = await getStats();
  const popularSearches = await getPopularSearches(15);

  if (!stats) {
    return ctx.editMessageText('❌ Ошибка загрузки статистики', statsMenuKeyboard);
  }

  let message = '🔍 Статистика поисков\n\n';
  message += `📊 Всего поисков: ${stats.totalSearches}\n`;
  message += `📅 Поисков за 24ч: ${stats.searchesToday}\n\n`;
  
  message += '🔥 Популярные запросы (за неделю):\n\n';
  popularSearches.forEach((search, index) => {
    message += `${index + 1}. "${search.query}" - ${search.count}x\n`;
  });

  await ctx.editMessageText(message, statsMenuKeyboard);
});

// Статистика: Активность
bot.action('stats_activity', async (ctx) => {
  const userId = ctx.from?.id;
  if (userId !== config.adminUserId) {
    return ctx.answerCbQuery('❌ Доступ запрещён');
  }

  await ctx.answerCbQuery('⏳ Загружаю...');

  const hourlyActivity = await getActivityByHour();
  const stats = await getStats();

  if (!stats) {
    return ctx.editMessageText('❌ Ошибка загрузки статистики', statsMenuKeyboard);
  }

  let message = '📈 Активность за 24 часа\n\n';
  
  // График активности по часам (UTC)
  const maxActivity = Math.max(...hourlyActivity);
  hourlyActivity.forEach((count, hour) => {
    const bars = Math.round((count / maxActivity) * 10);
    const graph = '█'.repeat(bars) + '░'.repeat(10 - bars);
    message += `${hour.toString().padStart(2, '0')}:00 ${graph} ${count}\n`;
  });

  message += `\n📊 Всего запросов: ${stats.requestsToday}`;

  await ctx.editMessageText(message, statsMenuKeyboard);
});

// Статистика: Скачивания
bot.action('stats_downloads', async (ctx) => {
  const userId = ctx.from?.id;
  if (userId !== config.adminUserId) {
    return ctx.answerCbQuery('❌ Доступ запрещён');
  }

  await ctx.answerCbQuery('⏳ Загружаю...');

  const downloadStats = await getDownloadStats();

  if (!downloadStats) {
    return ctx.editMessageText('❌ Ошибка загрузки статистики', statsMenuKeyboard);
  }

  let message = '📥 Статистика скачиваний\n\n';
  message += `📊 Всего скачиваний: ${downloadStats.totalDownloads}\n`;
  message += `📅 Скачиваний за 24ч: ${downloadStats.downloadsToday}\n`;
  message += `📦 Средний размер: ${formatFileSize(downloadStats.avgSize)}\n`;
  message += `💾 Всего передано: ${formatFileSize(downloadStats.totalSize)}\n\n`;
  
  if (downloadStats.popularMods.length > 0) {
    message += '🔥 Популярные моды (за неделю):\n\n';
    downloadStats.popularMods.forEach((mod, index) => {
      message += `${index + 1}. ${mod.name} - ${mod.count}x\n`;
    });
  } else {
    message += '📭 Пока нет скачиваний';
  }

  await ctx.editMessageText(message, statsMenuKeyboard);
});
