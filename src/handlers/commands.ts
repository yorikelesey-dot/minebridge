import { Context, Markup } from 'telegraf';
import { config } from '../config';
import { getUserBot, supabase } from '../database';
import { mainMenuKeyboard } from '../keyboards';

export async function handleStart(ctx: Context) {
  console.log('🔍 BOT VERSION: 2.0.0 - 10.02.2026 14:30');
  
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
  
  await ctx.reply(
    '👋 Привет! Я бот для поиска и скачивания модов Minecraft.\n\n' +
    '🔍 Выбери категорию:\n' +
    '• 🔧 Моды\n' +
    '• ✨ Шейдеры\n' +
    '• 🎨 Ресурспаки\n\n' +
    `📢 Канал: ${config.newsChannelLink}\n\n` +
    `🤖 Версия: 2.0.0\n\n` +
    `💡 Команды:\n` +
    `/start - Главное меню\n` +
    `/mybot - Управление ботом\n` +
    `/mystats - Статистика\n` +
    `/channel - Наш канал`,
    keyboard
  );
}

export async function handleChannel(ctx: Context) {
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
          [{ text: '📢 Подписаться на канал', url: config.newsChannelLink }],
          [{ text: '« Главное меню', callback_data: 'main_menu' }]
        ]
      }
    }
  );
}

export async function handleMyBot(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userBot = await getUserBot(userId);

  if (!userBot) {
    return ctx.reply(
      '❌ У тебя нет бота.',
      mainMenuKeyboard
    );
  }

  await ctx.reply(
    `🤖 Твой бот\n\n` +
    `Имя: ${userBot.bot_name}\n` +
    `Username: @${userBot.bot_username}\n` +
    `Статус: ${userBot.is_active ? '✅ Активен' : '❌ Неактивен'}\n` +
    `Создан: ${new Date(userBot.created_at).toLocaleDateString('ru-RU')}\n\n` +
    `⚙️ Управление:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🤖 Открыть бота', url: `https://t.me/${userBot.bot_username}` }],
          [{ text: '🗑️ Удалить бота', callback_data: 'delete_my_bot' }],
          [{ text: '« Назад', callback_data: 'main_menu' }]
        ]
      }
    }
  );
}

export async function handleMyStats(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

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

    let message = '📊 Твоя статистика\n\n';
    message += `📈 Всего запросов: ${requests?.length || 0}\n`;
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

    await ctx.reply(message, mainMenuKeyboard);
  } catch (error) {
    console.error('MyStats error:', error);
    await ctx.reply('❌ Ошибка загрузки статистики');
  }
}
