import { Context } from 'telegraf';
import { config } from '../config';
import { getActivityByHour, getDownloadStats, getPopularSearches, getStats, getTopUsers } from '../database';
import { statsMenuKeyboard } from '../keyboards';
import { formatFileSize } from '../utils/download';

export async function handleAdminStats(ctx: Context) {
  const userId = ctx.from?.id;
  if (userId !== config.adminUserId) {
    return ctx.answerCbQuery('❌ Доступ запрещён');
  }

  await ctx.editMessageText(
    '📊 Статистика бота\n\nВыбери раздел:',
    statsMenuKeyboard
  );
}

export async function handleStatsUsers(ctx: Context) {
  const userId = ctx.from?.id;
  if (userId !== config.adminUserId) {
    return ctx.answerCbQuery('❌ Доступ запрещён');
  }

  await ctx.answerCbQuery('⏳ Загружаю...');

  try {
    const stats = await getStats();
    const topUsers = await getTopUsers(10);

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
}

export async function handleStatsSearches(ctx: Context) {
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
}

export async function handleStatsActivity(ctx: Context) {
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
  
  const maxActivity = Math.max(...hourlyActivity);
  hourlyActivity.forEach((count, hour) => {
    const bars = Math.round((count / maxActivity) * 10);
    const graph = '█'.repeat(bars) + '░'.repeat(10 - bars);
    message += `${hour.toString().padStart(2, '0')}:00 ${graph} ${count}\n`;
  });

  message += `\n📊 Всего запросов: ${stats.requestsToday}`;

  await ctx.editMessageText(message, statsMenuKeyboard);
}

export async function handleStatsDownloads(ctx: Context) {
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
}
