# 🚀 Глобальное обновление бота MineBridge

---

## 🎯 Основная идея

Превратить бота из простого поисковика в **полноценную платформу для управления модами** с интеллектуальными функциями, социальными элементами и персонализацией.

---

## 🔥 Критические улучшения

### 1. Модульная архитектура бота ✅ ВЫПОЛНЕНО

**Проблема:** bot.ts содержит 1352 строк - это кошмар для поддержки

**Решение:**
```
src/
├── bot.ts                    # Только инициализация
├── handlers/
│   ├── index.ts             # Экспорт всех handlers
│   ├── commands.ts          # /start, /mybot, /mystats, /channel
│   ├── search.ts            # Поиск модов
│   ├── download.ts          # Скачивание файлов
│   ├── admin.ts             # Админ-панель
│   ├── inline.ts            # Inline режим
│   ├── channel.ts           # Рассылка новостей
│   └── favorites.ts         # Избранное (новое)
├── services/
│   ├── search-service.ts    # Логика поиска
│   ├── cache-service.ts     # Кэширование
│   ├── stats-service.ts     # Статистика
│   ├── recommendation.ts    # Рекомендации (новое)
│   └── compatibility.ts     # Проверка совместимости (новое)
├── middleware/
│   ├── rate-limit.ts        # Rate limiting
│   ├── auth.ts              # Аутентификация
│   └── logger.ts            # Логирование
└── types/
    ├── user.ts
    ├── mod.ts
    ├── state.ts
    └── api.ts
```

**Преимущества:**
- Легче поддерживать
- Легче тестировать
- Легче добавлять функции
- Лучше читаемость

---

### 2. Система кэширования ✅ ВЫПОЛНЕНО

**Реализация:**
```typescript
// src/services/cache-service.ts
import Redis from 'ioredis';

class CacheService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  // Кэширование поиска (10 минут)
  async getOrSearchMods(query: string, type: string) {
    const key = `search:${query}:${type}`;
    const cached = await this.redis.get(key);
    
    if (cached) return JSON.parse(cached);
    
    const results = await searchModrinth(query, type);
    await this.redis.setex(key, 600, JSON.stringify(results));
    
    return results;
  }
  
  // Кэширование версий (1 час)
  async getOrFetchVersions(projectId: string) {
    const key = `versions:${projectId}`;
    const cached = await this.redis.get(key);
    
    if (cached) return JSON.parse(cached);
    
    const versions = await getModrinthVersions(projectId);
    await this.redis.setex(key, 3600, JSON.stringify(versions));
    
    return versions;
  }
  
  // Инвалидация кэша
  async invalidate(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

export const cacheService = new CacheService();
```

**Что кэшировать:**
- Результаты поиска (10 минут)
- Версии модов (1 час)
- Информацию о проектах (1 час)
- Рекомендации (30 минут)

---

### 3. Система рекомендаций

**Алгоритм:**
```typescript
// src/services/recommendation.ts
class RecommendationService {
  
  async getRecommendations(userId: number, limit: number = 10) {
    // 1. Получить историю поиска пользователя
    const searches = await getSearchHistory(userId);
    
    // 2. Найти похожие моды
    const recommendations = new Map<string, number>();
    
    for (const search of searches) {
      const similar = await this.findSimilarMods(search.query);
      
      similar.forEach(mod => {
        const score = recommendations.get(mod.project_id) || 0;
        recommendations.set(mod.project_id, score + 1);
      });
    }
    
    // 3. Отсортировать по популярности
    const sorted = Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
    
    // 4. Получить полную информацию
    const mods = await Promise.all(
      sorted.map(id => getModInfo(id))
    );
    
    return mods;
  }
  
  private async findSimilarMods(query: string) {
    // Поиск похожих модов по ключевым словам
    const keywords = this.extractKeywords(query);
    const results = [];
    
    for (const keyword of keywords) {
      const mods = await searchModrinth(keyword, 'mod');
      results.push(...mods);
    }
    
    // Удалить дубликаты
    return [...new Map(results.map(m => [m.project_id, m])).values()];
  }
  
  private extractKeywords(query: string): string[] {
    // Извлечение ключевых слов из запроса
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);
  }
}

export const recommendationService = new RecommendationService();
```

**Команда:**
```typescript
bot.command('recommendations', async (ctx) => {
  const userId = ctx.from?.id;
  const recs = await recommendationService.getRecommendations(userId);
  
  if (recs.length === 0) {
    return ctx.reply('📭 Нет рекомендаций. Сделай несколько поисков!');
  }
  
  let message = '💡 Рекомендации для тебя:\n\n';
  recs.forEach((mod, i) => {
    message += `${i + 1}. ${mod.title}\n`;
    message += `   📥 ${mod.downloads} загрузок\n`;
    message += `   ${mod.description.substring(0, 50)}...\n\n`;
  });
  
  await ctx.reply(message, createResultsKeyboard(recs, 'modrinth', 'mod'));
});
```

---

### 4. Система избранного

**Таблица БД:**
```sql
CREATE TABLE favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  source TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id, source)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
```

**Сервис:**
```typescript
// src/services/favorites-service.ts
class FavoritesService {
  
  async addToFavorites(userId: number, projectId: string, projectName: string, type: string, source: string) {
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        project_id: projectId,
        project_name: projectName,
        project_type: type,
        source: source,
      });
    
    if (error) throw error;
  }
  
  async removeFromFavorites(userId: number, projectId: string) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);
    
    if (error) throw error;
  }
  
  async getFavorites(userId: number) {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  async isFavorite(userId: number, projectId: string) {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();
    
    return !!data;
  }
}

export const favoritesService = new FavoritesService();
```

**Обработчики:**
```typescript
// src/handlers/favorites.ts
bot.action(/favorite_add_(.+)_(.+)/, async (ctx) => {
  const projectId = ctx.match[1];
  const projectName = ctx.match[2];
  
  await favoritesService.addToFavorites(
    ctx.from?.id,
    projectId,
    projectName,
    'mod',
    'modrinth'
  );
  
  await ctx.answerCbQuery('⭐ Добавлено в избранное!');
});

bot.action(/favorite_remove_(.+)/, async (ctx) => {
  const projectId = ctx.match[1];
  
  await favoritesService.removeFromFavorites(ctx.from?.id, projectId);
  
  await ctx.answerCbQuery('❌ Удалено из избранного');
});

bot.command('favorites', async (ctx) => {
  const userId = ctx.from?.id;
  const favorites = await favoritesService.getFavorites(userId);
  
  if (favorites.length === 0) {
    return ctx.reply('📭 Избранное пусто');
  }
  
  let message = '⭐ Твои избранные моды:\n\n';
  favorites.forEach((fav, i) => {
    message += `${i + 1}. ${fav.project_name}\n`;
  });
  
  await ctx.reply(message);
});
```

---

### 5. Система уведомлений об обновлениях

**Таблица БД:**
```sql
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  last_version TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
```

**Сервис:**
```typescript
// src/services/subscription-service.ts
class SubscriptionService {
  
  async subscribe(userId: number, projectId: string, projectName: string) {
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        project_id: projectId,
        project_name: projectName,
        last_version: await this.getLatestVersion(projectId),
      });
    
    if (error) throw error;
  }
  
  async unsubscribe(userId: number, projectId: string) {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);
    
    if (error) throw error;
  }
  
  async checkUpdates() {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*');
    
    for (const sub of subs || []) {
      const latestVersion = await this.getLatestVersion(sub.project_id);
      
      if (latestVersion !== sub.last_version) {
        // Отправить уведомление
        await this.notifyUser(sub.user_id, sub.project_name, latestVersion);
        
        // Обновить версию
        await supabase
          .from('subscriptions')
          .update({ last_version: latestVersion })
          .eq('id', sub.id);
      }
    }
  }
  
  private async getLatestVersion(projectId: string) {
    const versions = await getModrinthVersions(projectId);
    return versions[0]?.version_number || 'unknown';
  }
  
  private async notifyUser(userId: number, projectName: string, version: string) {
    try {
      await bot.telegram.sendMessage(
        userId,
        `🆕 Обновление: ${projectName}\n\n` +
        `Новая версия: ${version}\n\n` +
        `Используй /favorites для скачивания`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📥 Скачать', callback_data: `download_${projectName}` }]
            ]
          }
        }
      );
    } catch (error) {
      console.error(`Failed to notify user ${userId}:`, error);
    }
  }
}

export const subscriptionService = new SubscriptionService();

// Cron job для проверки обновлений каждый час
schedule.scheduleJob('0 * * * *', () => {
  subscriptionService.checkUpdates();
});
```

---

### 6. Система рейтингов и отзывов

**Таблица БД:**
```sql
CREATE TABLE ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX idx_ratings_project ON ratings(project_id);
```

**Сервис:**
```typescript
// src/services/rating-service.ts
class RatingService {
  
  async rateProject(userId: number, projectId: string, rating: number, comment?: string) {
    const { error } = await supabase
      .from('ratings')
      .upsert({
        user_id: userId,
        project_id: projectId,
        rating,
        comment,
      });
    
    if (error) throw error;
  }
  
  async getAverageRating(projectId: string) {
    const { data } = await supabase
      .from('ratings')
      .select('rating')
      .eq('project_id', projectId);
    
    if (!data || data.length === 0) return 0;
    
    const sum = data.reduce((acc, r) => acc + r.rating, 0);
    return (sum / data.length).toFixed(1);
  }
  
  async getTopRated(limit: number = 10) {
    const { data } = await supabase
      .from('ratings')
      .select('project_id, rating')
      .order('rating', { ascending: false })
      .limit(limit);
    
    return data || [];
  }
}

export const ratingService = new RatingService();
```

---

### 7. Проверка совместимости модов

**Сервис:**
```typescript
// src/services/compatibility-service.ts
class CompatibilityService {
  
  async checkCompatibility(modIds: string[]) {
    const mods = await Promise.all(
      modIds.map(id => getModInfo(id))
    );
    
    const conflicts = [];
    
    // Проверить версии Minecraft
    const gameVersions = new Map<string, string[]>();
    mods.forEach(mod => {
      mod.versions.forEach(v => {
        if (!gameVersions.has(v)) {
          gameVersions.set(v, []);
        }
        gameVersions.get(v)?.push(mod.name);
      });
    });
    
    // Проверить загрузчики
    const loaders = new Map<string, string[]>();
    mods.forEach(mod => {
      mod.loaders.forEach(l => {
        if (!loaders.has(l)) {
          loaders.set(l, []);
        }
        loaders.get(l)?.push(mod.name);
      });
    });
    
    // Найти конфликты
    for (let i = 0; i < mods.length; i++) {
      for (let j = i + 1; j < mods.length; j++) {
        const mod1 = mods[i];
        const mod2 = mods[j];
        
        // Проверить пересечение версий
        const commonVersions = mod1.versions.filter(v => 
          mod2.versions.includes(v)
        );
        
        if (commonVersions.length === 0) {
          conflicts.push({
            mod1: mod1.name,
            mod2: mod2.name,
            reason: 'Нет общих версий Minecraft',
            severity: 'high'
          });
        }
        
        // Проверить пересечение загрузчиков
        const commonLoaders = mod1.loaders.filter(l => 
          mod2.loaders.includes(l)
        );
        
        if (commonLoaders.length === 0) {
          conflicts.push({
            mod1: mod1.name,
            mod2: mod2.name,
            reason: 'Нет общих загрузчиков',
            severity: 'high'
          });
        }
      }
    }
    
    return {
      compatible: conflicts.length === 0,
      conflicts,
      summary: `${mods.length} модов, ${conflicts.length} конфликтов`
    };
  }
}

export const compatibilityService = new CompatibilityService();
```

---

### 8. Улучшенная статистика

**Новые метрики:**
```typescript
// src/services/stats-service.ts
class StatsService {
  
  async getUserStats(userId: number) {
    const [requests, searches, downloads, favorites, ratings] = await Promise.all([
      this.getUserRequests(userId),
      this.getUserSearches(userId),
      this.getUserDownloads(userId),
      favoritesService.getFavorites(userId),
      this.getUserRatings(userId),
    ]);
    
    return {
      totalRequests: requests.length,
      totalSearches: searches.length,
      totalDownloads: downloads.length,
      totalFavorites: favorites.length,
      totalRatings: ratings.length,
      favoriteCategory: this.getMostSearchedCategory(searches),
      mostDownloadedMod: this.getMostDownloadedMod(downloads),
      joinedDate: this.getJoinDate(requests),
      level: this.calculateUserLevel(requests.length),
    };
  }
  
  async getGlobalStats() {
    const [totalUsers, totalSearches, totalDownloads, topMods, topSearches] = await Promise.all([
      this.getTotalUsers(),
      this.getTotalSearches(),
      this.getTotalDownloads(),
      this.getTopMods(10),
      this.getTopSearches(10),
    ]);
    
    return {
      totalUsers,
      totalSearches,
      totalDownloads,
      topMods,
      topSearches,
      avgSearchesPerUser: totalSearches / totalUsers,
      avgDownloadsPerUser: totalDownloads / totalUsers,
    };
  }
  
  private calculateUserLevel(requestCount: number): string {
    if (requestCount < 10) return '🟢 Новичок';
    if (requestCount < 50) return '🔵 Любитель';
    if (requestCount < 100) return '🟣 Фанат';
    if (requestCount < 500) return '🟠 Мастер';
    return '🔴 Легенда';
  }
}

export const statsService = new StatsService();
```

---

### 9. Система уровней пользователей

**Таблица БД:**
```sql
CREATE TABLE user_levels (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Система достижений:**
```typescript
const ACHIEVEMENTS = {
  FIRST_SEARCH: { name: '🔍 Первый поиск', xp: 10 },
  FIRST_DOWNLOAD: { name: '📥 Первое скачивание', xp: 20 },
  TEN_DOWNLOADS: { name: '📥 10 скачиваний', xp: 50 },
  HUNDRED_SEARCHES: { name: '🔍 100 поисков', xp: 100 },
  FAVORITE_COLLECTOR: { name: '⭐ 10 избранных', xp: 50 },
  RATING_MASTER: { name: '⭐ 10 оценок', xp: 50 },
  SOCIAL_BUTTERFLY: { name: '💬 Поделился 5 модами', xp: 75 },
};
```

---

### 10. Улучшенный inline режим

**Расширенный функционал:**
```typescript
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  
  if (!query || query.length < 2) {
    return ctx.answerInlineQuery([]);
  }
  
  try {
    // Поиск в кэше
    const results = await cacheService.getOrSearchMods(query, 'mod');
    
    const inlineResults = results.slice(0, 10).map((mod) => ({
      type: 'article' as const,
      id: mod.project_id,
      title: mod.title,
      description: `📥 ${mod.downloads} | ⭐ ${await ratingService.getAverageRating(mod.project_id)}`,
      thumb_url: mod.icon_url,
      input_message_content: {
        message_text: 
          `🔧 ${mod.title}\n\n` +
          `📝 ${mod.description}\n\n` +
          `📥 Загрузок: ${mod.downloads}\n` +
          `⭐ Рейтинг: ${await ratingService.getAverageRating(mod.project_id)}\n` +
          `🔗 Ссылка: https://modrinth.com/mod/${mod.slug}`,
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
});
```

---

## 📊 Новые таблицы БД

```sql
-- Избранное
CREATE TABLE favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  source TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id, source)
);

-- Подписки на обновления
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  last_version TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Рейтинги и отзывы
CREATE TABLE ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Уровни пользователей
CREATE TABLE user_levels (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_ratings_project ON ratings(project_id);
CREATE INDEX idx_user_levels_user ON user_levels(user_id);
```

---

## 🎯 Новые команды

```
/start              - Главное меню
/search [query]     - Быстрый поиск
/favorites          - Мои избранные моды
/recommendations    - Рекомендации для тебя
/subscriptions      - Мои подписки
/stats              - Моя статистика
/level              - Мой уровень и достижения
/check_compat       - Проверить совместимость
/top                - Топ модов
/mystats            - Полная статистика
/channel            - Наш канал
/mybot              - Управление ботом
```

---

## 🎨 Новые кнопки

```
Главное меню:
[🔧 Моды] [✨ Шейдеры] [🎨 Ресурспаки]
[🔍 Поиск] [💡 Рекомендации] [⭐ Избранное]
[📊 Статистика] [🏆 Уровень] [📢 Канал]

Карточка мода:
[⭐ Добавить в избранное] [🔔 Подписаться]
[⭐ Оценить] [📤 Поделиться]
[📥 Скачать] [« Назад]

Результаты поиска:
[1. Мод] [2. Мод] [3. Мод]
[◀️ Назад] [1/5] [Вперёд ▶️]
[💡 Рекомендации] [⭐ Избранное]
```

---

## 🚀 Приоритет реализации

### Фаза 1 (1-2 недели)
- ✅ Модульная архитектура - ВЫПОЛНЕНО (10.04.2026)
- ✅ Система кэширования - ВЫПОЛНЕНО (10.04.2026)
- ⏳ Система избранного - В ОЖИДАНИИ

### Фаза 2 (2-3 недели)
- ✅ Система рекомендаций
- ✅ Система уведомлений
- ✅ Система рейтингов

### Фаза 3 (3-4 недели)
- ✅ Проверка совместимости
- ✅ Система уровней
- ✅ Улучшенная статистика

---

## 💡 Дополнительные идеи

### Социальные функции
- Поделиться модом в чате
- Создать коллекцию модов
- Совместные сборки

### Интеграции
- Discord webhook для новостей
- Telegram канал для обновлений
- API для разработчиков

### Оптимизация
- Batch запросы к API
- Предзагрузка популярных модов
- Сжатие данных

### Аналитика
- Тепловая карта популярности
- Тренды модов
- Прогнозирование популярности

---

**Это превратит бота в полноценную платформу!** 🎉

