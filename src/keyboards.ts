import { Markup } from 'telegraf';

// Постоянная клавиатура (внизу экрана)
export const permanentKeyboard = Markup.keyboard([
  ['🏠 Главное меню', '📊 Статистика'],
  ['🔧 Моды', '✨ Шейдеры'],
  ['🎨 Ресурспаки', '🔍 Поиск'],
  ['📈 Моя статистика', '📢 Канал'],
]).resize();

export const permanentKeyboardUser = Markup.keyboard([
  ['🏠 Главное меню', '📈 Моя статистика'],
  ['🔧 Моды', '✨ Шейдеры'],
  ['🎨 Ресурспаки', '🔍 Поиск'],
  ['📢 Канал'],
]).resize();

export const mainMenuKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🔧 Моды', 'search_mod'),
    Markup.button.callback('✨ Шейдеры', 'search_shader'),
  ],
  [
    Markup.button.callback('🎨 Ресурспаки', 'search_resourcepack'),
    Markup.button.callback('🔍 Поиск', 'search_custom'),
  ],
]);

export const adminMenuKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🔧 Моды', 'search_mod'),
    Markup.button.callback('✨ Шейдеры', 'search_shader'),
  ],
  [
    Markup.button.callback('🎨 Ресурспаки', 'search_resourcepack'),
    Markup.button.callback('🔍 Поиск', 'search_custom'),
  ],
  [
    Markup.button.callback('📊 Статистика', 'admin_stats'),
  ],
]);

export const statsMenuKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('👥 Пользователи', 'stats_users'),
    Markup.button.callback('🔍 Поиски', 'stats_searches'),
  ],
  [
    Markup.button.callback('📥 Скачивания', 'stats_downloads'),
    Markup.button.callback('📈 Активность', 'stats_activity'),
  ],
  [
    Markup.button.callback('« Назад', 'main_menu'),
  ],
]);

export const gameVersionKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('1.21.4', 'version_1.21.4'),
    Markup.button.callback('1.21.3', 'version_1.21.3'),
  ],
  [
    Markup.button.callback('1.21.1', 'version_1.21.1'),
    Markup.button.callback('1.21', 'version_1.21'),
  ],
  [
    Markup.button.callback('1.20.6', 'version_1.20.6'),
    Markup.button.callback('1.20.4', 'version_1.20.4'),
  ],
  [
    Markup.button.callback('1.20.2', 'version_1.20.2'),
    Markup.button.callback('1.20.1', 'version_1.20.1'),
  ],
  [
    Markup.button.callback('1.19.4', 'version_1.19.4'),
    Markup.button.callback('1.19.2', 'version_1.19.2'),
  ],
  [
    Markup.button.callback('1.18.2', 'version_1.18.2'),
    Markup.button.callback('1.17.1', 'version_1.17.1'),
  ],
  [
    Markup.button.callback('1.16.5', 'version_1.16.5'),
    Markup.button.callback('1.12.2', 'version_1.12.2'),
  ],
  [
    Markup.button.callback('✏️ Ввести свою', 'version_custom'),
    Markup.button.callback('🔙 Любая', 'version_any'),
  ],
  [
    Markup.button.callback('« Назад', 'main_menu'),
  ],
]);

export const loaderKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🔨 Forge', 'loader_forge'),
    Markup.button.callback('🧵 Fabric', 'loader_fabric'),
  ],
  [
    Markup.button.callback('🪡 Quilt', 'loader_quilt'),
    Markup.button.callback('⚒️ NeoForge', 'loader_neoforge'),
  ],
  [
    Markup.button.callback('✏️ Ввести свой', 'loader_custom'),
    Markup.button.callback('🔙 Любой', 'loader_any'),
  ],
  [
    Markup.button.callback('« Назад', 'main_menu'),
  ],
]);

export function createResultsKeyboard(results: any[], source: 'modrinth' | 'curseforge', type: string, page: number = 0) {
  const itemsPerPage = 5;
  const totalPages = Math.ceil(results.length / itemsPerPage);
  const start = page * itemsPerPage;
  const end = start + itemsPerPage;
  
  const buttons = results.slice(start, end).map((item, index) => {
    const title = source === 'modrinth' ? item.title : item.name;
    const id = source === 'modrinth' ? item.project_id : item.id;
    return [Markup.button.callback(
      `${start + index + 1}. ${title.substring(0, 30)}...`,
      `select_${source}_${type}_${id}`
    )];
  });

  // Навигация
  const nav = [];
  if (page > 0) {
    nav.push(Markup.button.callback('◀️ Назад', `page_${source}_${type}_${page - 1}`));
  }
  if (totalPages > 1) {
    nav.push(Markup.button.callback(`${page + 1}/${totalPages}`, 'noop'));
  }
  if (page < totalPages - 1) {
    nav.push(Markup.button.callback('Вперёд ▶️', `page_${source}_${type}_${page + 1}`));
  }
  
  if (nav.length > 0) {
    buttons.push(nav);
  }

  buttons.push([Markup.button.callback('« Главное меню', 'main_menu')]);
  return Markup.inlineKeyboard(buttons);
}

export function createVersionsKeyboard(versions: any[], source: 'modrinth' | 'curseforge', projectId: string, projectSlug?: string) {
  const buttons = versions.slice(0, 5).map((version, index) => {
    if (source === 'modrinth') {
      const gameVer = version.game_versions[0] || 'N/A';
      const loader = version.loaders[0] || 'N/A';
      return [Markup.button.callback(
        `${version.version_number} (${gameVer}, ${loader})`,
        `download_modrinth_${projectId}_${version.id}`
      )];
    } else {
      const gameVer = version.gameVersions[0] || 'N/A';
      return [Markup.button.callback(
        `${version.displayName} (${gameVer})`,
        `download_curseforge_${projectId}_${version.id}`
      )];
    }
  });

  // Кнопка "Поделиться"
  if (source === 'modrinth' && projectSlug) {
    buttons.push([Markup.button.url(
      '🔗 Поделиться',
      `https://modrinth.com/mod/${projectSlug}`
    )]);
  }

  buttons.push([Markup.button.callback('« Назад', 'main_menu')]);
  return Markup.inlineKeyboard(buttons);
}
