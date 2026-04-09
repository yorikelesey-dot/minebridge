import { Context } from 'telegraf';
import { config } from '../config';
import { supabase } from '../database';

export async function handleChannelPost(ctx: Context) {
  console.log('📢 Received channel_post update:', {
    chatId: ctx.channelPost?.chat.id,
    chatTitle: ctx.channelPost?.chat.title,
    messageId: ctx.channelPost?.message_id
  });
  
  if (ctx.channelPost?.chat.id === config.newsChannelId) {
    try {
      console.log('📢 New post from news channel, broadcasting to users...');
      
      const { data: users, error: usersError } = await supabase
        .from('user_requests')
        .select('user_id')
        .order('timestamp', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }

      const uniqueUsers = [...new Set(users?.map((u: any) => u.user_id) || [])];
      console.log(`Found ${uniqueUsers.length} unique users`);

      let successCount = 0;
      let failCount = 0;

      for (const userId of uniqueUsers) {
        try {
          await ctx.telegram.forwardMessage(userId, config.newsChannelId, ctx.channelPost.message_id);
          
          await ctx.telegram.sendMessage(
            userId,
            `📢 Больше новостей в нашем канале: ${config.newsChannelLink}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📢 Подписаться на канал', url: config.newsChannelLink }]
                ]
              }
            }
          );
          
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 35));
        } catch (error: any) {
          failCount++;
          if (error.response?.error_code !== 403) {
            console.error(`Failed to send to ${userId}:`, error.response?.description || error.message);
          }
        }
      }

      console.log(`✅ News broadcast completed: ${successCount} sent, ${failCount} failed`);
      
      await supabase.from('user_requests').insert({
        user_id: config.adminUserId,
        username: 'system',
        request_type: 'news_broadcast',
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('News broadcast error:', error);
    }
  }
}
