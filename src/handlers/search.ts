import { Context } from 'telegraf';
import { getModrinthVersions, searchModrinth } from '../api/modrinth';
import { checkRateLimit, logRequest, saveSearchHistory } from '../database';
import { createResultsKeyboard, gameVersionKeyboard, loaderKeyboard, mainMenuKeyboard, shaderLoaderKeyboard } from '../keyboards';
import { cacheService } from '../services/cache-service';
import { stateService } from '../services/state-service';

export async function handleSearchMod(ctx: Context, userId: number) {
  if (!(await checkRateLimit(userId))) {
    return ctx.reply('⏳ Слишком много запросов. Подожди минуту.');
  }

  stateService.setUserState(userId, { action: 'select_version', projectType: 'mod' });
  await ctx.reply('🎮 Выбери версию Minecraft:', gameVersionKeyboard);
  await logRequest(userId, ctx.from?.username, 'search_mod');
}

export async function handleSearchShader(ctx: Context, userId: number) {
  if (!(await checkRateLimit(userId))) {
    return ctx.reply('⏳ Слишком много запросов. Подожди минуту.');
  }

  stateService.setUserState(userId, { action: 'select_version', projectType: 'shader' });
  await ctx.reply('🎮 Выбери версию Minecraft:', gameVersionKeyboard);
  await logRequest(userId, ctx.from?.username, 'search_shader');
}

export async function handleSearchResourcepack(ctx: Context, userId: number) {
  if (!(await checkRateLimit(userId))) {
    return ctx.reply('⏳ Слишком много запросов. Подожди минуту.');
  }

  stateService.setUserState(userId, { action: 'select_version', projectType: 'resourcepack' });
  await ctx.reply('🎮 Выбери версию Minecraft:', gameVersionKeyboard);
  await logRequest(userId, ctx.from?.username, 'search_resourcepack');
}

export async function handleSearchCustom(ctx: Context, userId: number) {
  if (!(await checkRateLimit(userId))) {
    return ctx.reply('⏳ Слишком много запросов. Подожди минуту.');
  }

  stateService.setUserState(userId, { action: 'search_custom' });
  await ctx.reply('🔍 Введи запрос для поиска:');
  await logRequest(userId, ctx.from?.username, 'search_custom');
}

export async function handleVersionSelection(ctx: Context, userId: number, version: string) {
  const state = stateService.getUserState(userId);
  if (!state) return;

  if (version === 'custom') {
    state.action = 'input_version';
    stateService.setUserState(userId, state);
    await ctx.editMessageText('✏️ Введи версию Minecraft (например: 1.20.1):');
    return;
  }

  state.gameVersion = version === 'any' ? undefined : version;
  
  if (state.projectType === 'resourcepack') {
    state.action = 'search_input';
    stateService.setUserState(userId, state);
    
    let filterText = '';
    if (state.gameVersion) filterText += `\n🎮 Версия: ${state.gameVersion}`;
    
    await ctx.editMessageText(`🔍 Введи название ресурспака для поиска:${filterText}`);
    return;
  }
  
  state.action = 'select_loader';
  stateService.setUserState(userId, state);

  if (state.projectType === 'shader') {
    await ctx.editMessageText('⚙️ Выбери загрузчик шейдеров:', shaderLoaderKeyboard);
  } else {
    await ctx.editMessageText('⚙️ Выбери загрузчик модов:', loaderKeyboard);
  }
}

export async function handleLoaderSelection(ctx: Context, userId: number, loader: string) {
  const state = stateService.getUserState(userId);
  if (!state) return;

  if (loader === 'custom') {
    state.action = 'input_loader';
    stateService.setUserState(userId, state);
    await ctx.editMessageText('✏️ Введи название загрузчика (например: forge, fabric, quilt):');
    return;
  }

  state.loader = loader === 'any' ? undefined : loader;
  state.action = 'search_input';
  stateService.setUserState(userId, state);

  const typeText = state.projectType === 'mod' ? 'мода' : 
                   state.projectType === 'shader' ? 'шейдера' : 'ресурспака';
  
  let filterText = '';
  if (state.gameVersion) filterText += `\n🎮 Версия: ${state.gameVersion}`;
  if (state.loader) filterText += `\n⚙️ Загрузчик: ${state.loader}`;

  await ctx.editMessageText(`🔍 Введи название ${typeText} для поиска:${filterText}`);
}

export async function performSearch(ctx: Context, userId: number, query: string) {
  const state = stateService.getUserState(userId);
  if (!state) return;

  await ctx.reply('🔎 Ищу...');

  let projectType = 'mod';
  if (state.projectType === 'shader') projectType = 'shader';
  if (state.projectType === 'resourcepack') projectType = 'resourcepack';

  // Поиск с кэшированием
  const modrinthResults = await cacheService.getOrSearchMods(
    query,
    projectType,
    () => searchModrinth(query, projectType)
  );
  
  let results = modrinthResults;

  // Фильтрация по версии и загрузчику
  if (state.gameVersion || state.loader) {
    const versions = await Promise.all(
      results.map(async (item) => {
        const vers = await cacheService.getOrFetchVersions(
          item.project_id,
          () => getModrinthVersions(item.project_id)
        );
        return { item, versions: vers };
      })
    );

    results = versions
      .filter(({ versions: vers }) => {
        return vers.some((v) => {
          const versionMatch = !state.gameVersion || v.game_versions.includes(state.gameVersion);
          const loaderMatch = !state.loader || v.loaders.map((l: string) => l.toLowerCase()).includes(state.loader.toLowerCase());
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
    stateService.deleteUserState(userId);
    return;
  }

  await saveSearchHistory(userId, query, results.length);

  stateService.setSearchResults(userId, {
    results,
    projectType,
    gameVersion: state.gameVersion,
    loader: state.loader,
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
  stateService.deleteUserState(userId);
}
