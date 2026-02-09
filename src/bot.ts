import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import { mainMenuKeyboard, createResultsKeyboard, createVersionsKeyboard, gameVersionKeyboard, loaderKeyboard } from './keyboards';
import { searchModrinth, getModrinthVersions } from './api/modrinth';
import { searchCurseForge, getCurseForgeFiles } from './api/curseforge';
import { checkRateLimit, logRequest, saveSearchHistory } from './database';
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
  timestamp: number;
}

const userStates = new Map<number, UserState>();

// Автоочистка старых состояний (старше 1 часа)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [userId, state] of userStates.entries()) {
    if (state.timestamp < oneHourAgo) {
      userStates.delete(userId);
    }
  }
  
  // Логирование размера Map
  if (userStates.size > 0) {
    console.log(`Active user states: ${userStates.size}`);
  }
}, 10 * 60 * 1000); // Каждые 10 минут

// Функция для установки состояния с timestamp
function setUserState(userId: number, state: Omit<UserState, 'timestamp'>) {
  userStates.set(userId, { ...state, timestamp: Date.now() });
}

// Команда /start
bot.command('start', async (ctx) => {
  await ctx.reply(
    '👋 Привет! Я бот для поиска и скачивания модов Minecraft.\n\n' +
    'Выбери категорию или используй поиск:',
    mainMenuKeyboard
  );
});

// Главное меню
bot.action('main_menu', async (ctx) => {
  await ctx.editMessageText(
    '🏠 Главное меню\n\nВыбери категорию или используй поиск:',
    mainMenuKeyboard
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

  let message = `📦 Найдено результатов: ${results.length}\n`;
  if (state.gameVersion) message += `🎮 Версия: ${state.gameVersion}\n`;
  if (state.loader) message += `⚙️ Загрузчик: ${state.loader}\n`;
  message += '\n';
  
  results.slice(0, 5).forEach((item, index) => {
    message += `${index + 1}. ${item.title}\n`;
    message += `   📥 ${item.downloads} загрузок\n`;
    message += `   ${item.description.substring(0, 60)}...\n\n`;
  });

  state.results = results;
  setUserState(userId, state);

  await ctx.reply(message, createResultsKeyboard(results, 'modrinth', projectType));
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
