import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import { mainMenuKeyboard, createResultsKeyboard, createVersionsKeyboard } from './keyboards';
import { searchModrinth, getModrinthVersions } from './api/modrinth';
import { searchCurseForge, getCurseForgeFiles } from './api/curseforge';
import { checkRateLimit, logRequest, saveSearchHistory } from './database';
import { downloadFile, formatFileSize, canSendDirectly } from './utils/download';

export const bot = new Telegraf(config.telegramToken);

// Хранилище состояний пользователей
const userStates = new Map<number, { action: string; data?: any }>();

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

  userStates.set(userId, { action: 'search_mod' });
  await ctx.editMessageText('🔧 Введи название мода для поиска:');
  await logRequest(userId, ctx.from?.username, 'search_mod');
});

// Обработка поиска шейдеров
bot.action('search_shader', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  userStates.set(userId, { action: 'search_shader' });
  await ctx.editMessageText('✨ Введи название шейдера для поиска:');
  await logRequest(userId, ctx.from?.username, 'search_shader');
});

// Обработка поиска ресурспаков
bot.action('search_resourcepack', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  userStates.set(userId, { action: 'search_resourcepack' });
  await ctx.editMessageText('🎨 Введи название ресурспака для поиска:');
  await logRequest(userId, ctx.from?.username, 'search_resourcepack');
});

// Кастомный поиск
bot.action('search_custom', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await checkRateLimit(userId))) {
    return ctx.answerCbQuery('⏳ Слишком много запросов. Подожди минуту.');
  }

  userStates.set(userId, { action: 'search_custom' });
  await ctx.editMessageText('🔍 Введи запрос для поиска:');
  await logRequest(userId, ctx.from?.username, 'search_custom');
});

// Обработка текстовых сообщений (поиск)
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const state = userStates.get(userId);
  if (!state) return;

  const query = ctx.message.text;
  
  await ctx.reply('🔎 Ищу...');

  let projectType = 'mod';
  if (state.action === 'search_shader') projectType = 'shader';
  if (state.action === 'search_resourcepack') projectType = 'resourcepack';

  // Поиск в Modrinth
  const results = await searchModrinth(query, projectType);

  if (results.length === 0) {
    await ctx.reply('😔 Ничего не найдено. Попробуй другой запрос.', mainMenuKeyboard);
    userStates.delete(userId);
    return;
  }

  await saveSearchHistory(userId, query, results.length);

  let message = `📦 Найдено результатов: ${results.length}\n\n`;
  results.slice(0, 5).forEach((item, index) => {
    message += `${index + 1}. ${item.title}\n`;
    message += `   📥 ${item.downloads} загрузок\n`;
    message += `   ${item.description.substring(0, 60)}...\n\n`;
  });

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
