import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import { mainMenuKeyboard, adminMenuKeyboard, createResultsKeyboard, createVersionsKeyboard, gameVersionKeyboard, loaderKeyboard, statsMenuKeyboard, permanentKeyboard, permanentKeyboardUser } from './keyboards';
import { searchModrinth, getModrinthVersions } from './api/modrinth';
import { searchCurseForge, getCurseForgeFiles } from './api/curseforge';
import { checkRateLimit, logRequest, saveSearchHistory, getStats, getTopUsers, getPopularSearches, getActivityByHour, logDownload, getDownloadStats } from './database';
import { downloadFile, formatFileSize, canSendDirectly } from './utils/download';

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
  const isAdmin = ctx.from?.id === config.adminUserId;
  const keyboard = isAdmin ? adminMenuKeyboard : mainMenuKeyboard;
  const permKeyboard = isAdmin ? permanentKeyboard : permanentKeyboardUser;
  
  await ctx.reply(
    '👋 Привет! Я бот для поиска и скачивания модов Minecraft.\n\n' +
    'Выбери категорию или используй поиск:',
    { ...keyboard, ...permKeyboard }
  );
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

  // Поиск в Modrinth
  let results = await searchModrinth(query, projectType);

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
    
    await ctx.reply(`😔 Ничего не найдено.${filterInfo}\n\nПопробуй другой запрос или измени фильтры.`, mainMenuKeyboard);
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

  let message = '📋 Доступные версии:\n\n';
  versions.slice(0, 5).forEach((version, index) => {
    message += `${index + 1}. ${version.version_number}\n`;
    message += `   🎮 ${version.game_versions.join(', ')}\n`;
    message += `   ⚙️ ${version.loaders.join(', ')}\n\n`;
  });

  await ctx.editMessageText(message, createVersionsKeyboard(versions, 'modrinth', projectId));
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

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Произошла ошибка. Попробуй позже.', mainMenuKeyboard);
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
