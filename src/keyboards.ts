import { Markup } from 'telegraf';

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

export function createResultsKeyboard(results: any[], source: 'modrinth' | 'curseforge', type: string) {
  const buttons = results.slice(0, 5).map((item, index) => {
    const title = source === 'modrinth' ? item.title : item.name;
    const id = source === 'modrinth' ? item.project_id : item.id;
    return [Markup.button.callback(
      `${index + 1}. ${title.substring(0, 30)}...`,
      `select_${source}_${type}_${id}`
    )];
  });

  buttons.push([Markup.button.callback('« Назад в меню', 'main_menu')]);
  return Markup.inlineKeyboard(buttons);
}

export function createVersionsKeyboard(versions: any[], source: 'modrinth' | 'curseforge', projectId: string) {
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

  buttons.push([Markup.button.callback('« Назад', 'main_menu')]);
  return Markup.inlineKeyboard(buttons);
}
