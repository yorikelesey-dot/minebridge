import { Context } from 'telegraf';
import { searchModrinth } from '../api/modrinth';
import { cacheService } from '../services/cache-service';

export async function handleInlineQuery(ctx: Context) {
  const query = ctx.inlineQuery?.query;
  
  if (!query || query.length < 2) {
    return ctx.answerInlineQuery([]);
  }

  try {
    const results = await cacheService.getOrSearchMods(
      query,
      'mod',
      () => searchModrinth(query, 'mod')
    );
    
    const inlineResults = results.slice(0, 10).map((mod) => ({
      type: 'article' as const,
      id: mod.project_id,
      title: mod.title,
      description: `📥 ${mod.downloads} загрузок | ${mod.description.substring(0, 100)}...`,
      thumb_url: mod.icon_url,
      input_message_content: {
        message_text: 
          `🔧 ${mod.title}\n\n` +
          `📝 ${mod.description}\n\n` +
          `📥 Загрузок: ${mod.downloads}\n` +
          `🔗 Ссылка: https://modrinth.com/mod/${mod.slug}\n\n` +
          `🤖 Найдено через @${ctx.botInfo.username}`,
      },
    }));

    await ctx.answerInlineQuery(inlineResults, {
      cache_time: 300,
      is_personal: false,
    });
  } catch (error) {
    console.error('Inline query error:', error);
    await ctx.answerInlineQuery([]);
  }
}
