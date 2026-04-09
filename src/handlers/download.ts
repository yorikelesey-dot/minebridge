import { Context } from 'telegraf';
import { getCurseForgeFiles } from '../api/curseforge';
import { getModrinthVersions } from '../api/modrinth';
import { logDownload } from '../database';
import { createVersionsKeyboard, mainMenuKeyboard } from '../keyboards';
import { cacheService } from '../services/cache-service';
import { stateService } from '../services/state-service';
import { canSendDirectly, downloadFile, formatFileSize } from '../utils/download';

export async function handleSelectModrinthProject(ctx: Context, projectId: string) {
  await ctx.answerCbQuery('⏳ Загружаю версии...');

  const versions = await cacheService.getOrFetchVersions(
    projectId,
    () => getModrinthVersions(projectId)
  );

  if (versions.length === 0) {
    return ctx.editMessageText('😔 Версии не найдены.', mainMenuKeyboard);
  }

  const search = stateService.getSearchResults(ctx.from?.id || 0);
  const project = search?.results.find((r: any) => r.project_id === projectId);
  const projectSlug = project?.slug;

  let message = '📋 Доступные версии:\n\n';
  versions.slice(0, 5).forEach((version, index) => {
    message += `${index + 1}. ${version.version_number}\n`;
    message += `   🎮 ${version.game_versions.join(', ')}\n`;
    message += `   ⚙️ ${version.loaders.join(', ')}\n\n`;
  });

  await ctx.editMessageText(message, createVersionsKeyboard(versions, 'modrinth', projectId, projectSlug));
}

export async function handleSelectCurseForgeProject(ctx: Context, projectId: string) {
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
}

export async function handleDownloadModrinth(ctx: Context, projectId: string, versionId: string) {
  await ctx.answerCbQuery('⏳ Подготавливаю файл...');

  try {
    const versions = await cacheService.getOrFetchVersions(
      projectId,
      () => getModrinthVersions(projectId)
    );
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
        
        if (userId) {
          await logDownload(userId, version.name, projectId, fileSize, 'modrinth');
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
      
      if (userId) {
        await logDownload(userId, version.name, projectId, fileSize, 'modrinth');
      }
    }
  } catch (error) {
    console.error('Download error:', error);
    await ctx.reply('❌ Произошла ошибка при скачивании.', mainMenuKeyboard);
  }
}

export async function handleDownloadCurseForge(ctx: Context, modId: number, fileId: number) {
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
}
