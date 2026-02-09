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
