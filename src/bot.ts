import { Markup, Telegraf } from 'telegraf';
import { config } from './config';
import { checkRateLimit, deleteUserBot, supabase } from './database';
import {
    handleAdminStats,
    handleStatsActivity,
    handleStatsDownloads,
    handleStatsSearches,
    handleStatsUsers
} from './handlers/admin';
import { handleChannelPost } from './handlers/channel';
import {
    handleChannel,
    handleMyBot,
    handleMyStats,
    handleStart
} from './handlers/commands';
import {
    handleDownloadCurseForge,
    handleDownloadModrinth,
    handleSelectCurseForgeProject,
    handleSelectModrinthProject
} from './handlers/download';
import { handleInlineQuery } from './handlers/inline';
import {
    handleLoaderSelection,
    handleSearchCustom,
    handleSearchMod,
    handleSearchResourcepack,
    handleSearchShader,
    handleVersionSelection,
    performSearch
} from './handlers/search';
import {
    mainMenuKeyboard
} from './keyboards';
import { stateService } from './services/state-service';

export const bot = new Telegraf(config.telegramToken);

// ==================== КОМАНДЫ ====================

bot.command('start', handleStart);
bot.command('channel', handleChannel);
bot.command('mybot', handleMyBot);
bot.command('mystats', handleMyStats);

// ==================== КНОПКИ ПОСТОЯННОЙ КЛАВИАТУРЫ ====================

bot.hears('🏠 Главное меню', async (ctx) => {
  const isAdmin = ctx.from?.id === config.adminUserId;
  
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🔧 Моды', 'search_mod'),
      Markup.button.callback('✨ Шейдеры', 'search_shader'),
    ],
    [
      Markup.button.callback('🎨 Ресурспаки', 'search_resourcepack'),
      Markup.button.callback('🔍 Поиск', 'search_custom'),
    ],
    [
      Markup.button.callback('📢 Канал', 'open_channel'),
      Markup.button.callback('📈 Моя статистика', 'my_stats'),
    ],
    [
      Markup.button.callback('👥 О авторах', 'about_authors'),
    ],
    ...(isAdmin ? [[Markup.button.callback('📊 Админ', 'admin_stats')]] : []),
  ]);
  
  await ctx.reply('🏠 Главное меню\n\n🔍 Выбери категорию:', keyboard);
});

bot.hears('🔧 Моды', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  await handleSearchMod(ctx, userId);
});

bot.hears('✨ Шейдеры', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  await handleSearchShader(ctx, userId);
});

bot.hears('🎨 Ресурспаки', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  await handleSearchResourcepack(ctx, userId);
});

bot.hears('🔍 Поиск', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  await handleSearchCustom(ctx, userId);
});

bot.hears('📊 Статистика', async (ctx) => {
  const userId = ctx.from?.id;
  if (userId !== config.adminUserId) {
    return ctx.reply('❌ Доступ запрещён');
  }
  await ctx.reply('📊 Статистика бота\n\nВыбери раздел:', { reply_markup: { inline_keyboard: [] } });
});

bot.hears('📈 Моя статистика', handleMyStats);

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

// ==================== CALLBACK ACTIONS ====================

// Главное меню
bot.action('main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  
  const isAdmin = ctx.from?.id === config.adminUserId;
  
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🔧 Моды', 'search_mod'),
      Markup.button.callback('✨ Шейдеры', 'search_shader'),
    ],
    [
      Markup.button.callback('🎨 Ресурспаки', 'search_resourcepack'),
      Markup.button.callback('🔍 Поиск', 'search_custom'),
    ],
    [
      Markup.button.callback('📢 Канал', 'open_channel'),
      Markup.button.callback('📈 Моя статистика', 'my_stats'),
    ],
    [
      Markup.button.callback('👥 О авторах', 'about_authors'),
    ],
    ...(isAdmin ? [[Markup.button.callback('📊 Админ', 'admin_stats')]] : []),
  ]);
  
  await ctx.editMessageText('🏠 Главное меню\n\n🔍 Выбери категорию:', keyboard);
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

// Открыть канал
bot.action('open_channel', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
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
          [{ text: '« Назад', callback_data: 'main_menu' }]
        ]
      }
    }
  );
});

// Моя статистика
bot.action('my_stats', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await ctx.answerCbQuery();

  try {
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

    if (searches && searches.length > 0) {
      message += '\n🔎 Последние поиски:\n';
      searches.slice(-5).reverse().forEach((search: any) => {
        message += `• ${search.query}\n`;
      });
    }

    await ctx.editMessageText(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '« Назад', callback_data: 'main_menu' }]
        ]
      }
    });
  } catch (error) {
    console.error('MyStats error:', error);
    await ctx.editMessageText('❌ Ошибка загрузки статистики', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '« Назад', callback_data: 'main_menu' }]
        ]
      }
    });
  }
});

// Удаление бота
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

// ==================== ПОИСК ====================

bot.action('search_mod', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  await handleSearchMod(ctx, userId);
});

bot.action('search_shader', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  await handleSearchShader(ctx, userId);
});

bot.action('search_resourcepack', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  await handleSearchResourcepack(ctx, userId);
});

bot.action('search_custom', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  await handleSearchCustom(ctx, userId);
});

// Выбор версии
bot.action(/version_(.+)/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const version = ctx.match[1];
  await handleVersionSelection(ctx, userId, version);
});

// Выбор загрузчика
bot.action(/loader_(.+)/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const loader = ctx.match[1];
  await handleLoaderSelection(ctx, userId, loader);
});

// ==================== ТЕКСТОВЫЕ СООБЩЕНИЯ ====================

bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = stateService.getUserState(userId);
  if (!state) return;

  const text = ctx.message.text;

  // Обработка кастомного ввода версии
  if (state.action === 'input_version') {
    state.gameVersion = text.trim();
    
    if (state.projectType === 'resourcepack') {
      state.action = 'search_input';
      stateService.setUserState(userId, state);
      
      await ctx.reply(`✅ Версия установлена: ${text}\n\n🔍 Введи название ресурспака для поиска:`);
      return;
    }
    
    state.action = 'select_loader';
    stateService.setUserState(userId, state);
    
    const keyboard = state.projectType === 'shader' ? 
      require('./keyboards').shaderLoaderKeyboard : 
      require('./keyboards').loaderKeyboard;
    
    await ctx.reply(`✅ Версия установлена: ${text}\n\n⚙️ Теперь выбери загрузчик:`, keyboard);
    return;
  }

  // Обработка кастомного ввода загрузчика
  if (state.action === 'input_loader') {
    state.loader = text.trim().toLowerCase();
    state.action = 'search_input';
    stateService.setUserState(userId, state);
    
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

  await performSearch(ctx, userId, text);
});

// ==================== ВЫБОР ПРОЕКТА И СКАЧИВАНИЕ ====================

bot.action(/select_modrinth_(.+)_(.+)/, async (ctx) => {
  const projectId = ctx.match[2];
  await handleSelectModrinthProject(ctx, projectId);
});

bot.action(/select_curseforge_(.+)_(.+)/, async (ctx) => {
  const projectId = ctx.match[2];
  await handleSelectCurseForgeProject(ctx, projectId);
});

bot.action(/download_modrinth_(.+)_(.+)/, async (ctx) => {
  const projectId = ctx.match[1];
  const versionId = ctx.match[2];
  await handleDownloadModrinth(ctx, projectId, versionId);
});

bot.action(/download_curseforge_(.+)_(.+)/, async (ctx) => {
  const modId = parseInt(ctx.match[1]);
  const fileId = parseInt(ctx.match[2]);
  await handleDownloadCurseForge(ctx, modId, fileId);
});

// ==================== ПАГИНАЦИЯ ====================

bot.action(/page_modrinth_(.+)_(\d+)/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const projectType = ctx.match[1];
  const page = parseInt(ctx.match[2]);

  const search = stateService.getSearchResults(userId);
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

  const { createResultsKeyboard } = require('./keyboards');
  await ctx.editMessageText(message, createResultsKeyboard(search.results, 'modrinth', projectType, page));
  await ctx.answerCbQuery();
});

bot.action('noop', async (ctx) => {
  await ctx.answerCbQuery();
});

// ==================== АДМИН-ПАНЕЛЬ ====================

bot.action('admin_stats', handleAdminStats);
bot.action('stats_users', handleStatsUsers);
bot.action('stats_searches', handleStatsSearches);
bot.action('stats_activity', handleStatsActivity);
bot.action('stats_downloads', handleStatsDownloads);

// ==================== INLINE РЕЖИМ ====================

bot.on('inline_query', handleInlineQuery);

// ==================== РАССЫЛКА НОВОСТЕЙ ====================

bot.on('channel_post', handleChannelPost);

// ==================== ОБРАБОТКА ОШИБОК ====================

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Произошла ошибка. Попробуй позже.', mainMenuKeyboard);
});
