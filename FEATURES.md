# 🎯 Возможности и планы развития

## ✅ Реализованные функции

### Основной функционал
- ✅ Поиск модов через Modrinth API
- ✅ Поиск шейдеров
- ✅ Поиск ресурспаков
- ✅ Скачивание файлов до 50 МБ
- ✅ Прямые ссылки для больших файлов
- ✅ Отображение версий игры и загрузчиков

### Безопасность
- ✅ Rate limiting (3 запроса/минуту)
- ✅ Логирование всех действий
- ✅ Обработка ошибок без падения бота

### Инфраструктура
- ✅ Serverless на Vercel
- ✅ Webhook вместо long polling
- ✅ Интеграция с Supabase
- ✅ TypeScript для типобезопасности

## 🚧 Планируемые функции

### Фаза 1: Улучшение поиска

#### Фильтры поиска
```typescript
// Фильтр по версии игры
bot.action('filter_version', async (ctx) => {
  const versions = ['1.20.4', '1.20.1', '1.19.4', '1.18.2'];
  // Показать клавиатуру с версиями
});

// Фильтр по загрузчику
bot.action('filter_loader', async (ctx) => {
  const loaders = ['Forge', 'Fabric', 'Quilt', 'NeoForge'];
  // Показать клавиатуру с загрузчиками
});
```

#### Избранное
```sql
-- Новая таблица
CREATE TABLE favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id, source)
);
```

```typescript
// Добавление в избранное
bot.action(/favorite_add_(.+)/, async (ctx) => {
  await addToFavorites(userId, projectId);
  await ctx.answerCbQuery('⭐ Добавлено в избранное!');
});

// Просмотр избранного
bot.command('favorites', async (ctx) => {
  const favorites = await getFavorites(userId);
  // Показать список
});
```

### Фаза 2: Социальные функции

#### Рейтинги и отзывы
```sql
CREATE TABLE user_ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
```

#### Рекомендации
```typescript
// На основе истории поиска
async function getRecommendations(userId: number) {
  // Анализ search_history
  // Поиск похожих модов
  // Возврат топ-5 рекомендаций
}

bot.command('recommendations', async (ctx) => {
  const recs = await getRecommendations(userId);
  // Показать рекомендации
});
```

### Фаза 3: Расширенный функционал

#### Сборки модов (Modpacks)
```typescript
// Создание сборки
bot.command('create_modpack', async (ctx) => {
  userStates.set(userId, { action: 'create_modpack', mods: [] });
  await ctx.reply('Введи название сборки:');
});

// Добавление мода в сборку
bot.action(/modpack_add_(.+)/, async (ctx) => {
  const state = userStates.get(userId);
  state.mods.push(modId);
  await ctx.answerCbQuery('Мод добавлен в сборку!');
});

// Экспорт сборки
bot.action('modpack_export', async (ctx) => {
  const modpack = createModpackFile(state.mods);
  await ctx.replyWithDocument(modpack);
});
```

#### Уведомления об обновлениях
```sql
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id TEXT NOT NULL,
  last_version TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
```

```typescript
// Подписка на обновления
bot.action(/subscribe_(.+)/, async (ctx) => {
  await subscribeToUpdates(userId, projectId);
  await ctx.answerCbQuery('🔔 Подписка оформлена!');
});

// Cron job для проверки обновлений
async function checkUpdates() {
  const subs = await getAllSubscriptions();
  for (const sub of subs) {
    const latestVersion = await getLatestVersion(sub.project_id);
    if (latestVersion !== sub.last_version) {
      await notifyUser(sub.user_id, sub.project_id, latestVersion);
    }
  }
}
```

#### Интеграция с CurseForge
```typescript
// Полная поддержка CurseForge API
import { searchCurseForge, getCurseForgeFiles } from './api/curseforge';

bot.action('search_curseforge', async (ctx) => {
  const results = await searchCurseForge(query);
  // Показать результаты
});

// Комбинированный поиск
bot.action('search_all', async (ctx) => {
  const [modrinthResults, curseforgeResults] = await Promise.all([
    searchModrinth(query),
    searchCurseForge(query)
  ]);
  // Объединить и показать
});
```

### Фаза 4: Аналитика и статистика

#### Личная статистика
```typescript
bot.command('stats', async (ctx) => {
  const stats = await getUserStats(userId);
  
  await ctx.reply(
    `📊 Твоя статистика:\n\n` +
    `🔍 Поисков: ${stats.searches}\n` +
    `📥 Скачиваний: ${stats.downloads}\n` +
    `⭐ Избранных: ${stats.favorites}\n` +
    `📅 С нами: ${stats.days_active} дней`
  );
});
```

#### Глобальная статистика
```typescript
bot.command('top', async (ctx) => {
  const topMods = await getTopMods();
  
  let message = '🏆 Топ-10 модов:\n\n';
  topMods.forEach((mod, i) => {
    message += `${i + 1}. ${mod.name} (${mod.downloads} скачиваний)\n`;
  });
  
  await ctx.reply(message);
});
```

### Фаза 5: Продвинутые функции

#### Автоматическое обновление модов
```typescript
// Загрузка списка модов из файла
bot.on('document', async (ctx) => {
  if (ctx.message.document.file_name.endsWith('.txt')) {
    const file = await ctx.telegram.getFileLink(ctx.message.document.file_id);
    const modList = await parseModList(file);
    
    // Проверка обновлений для каждого мода
    const updates = await checkModUpdates(modList);
    
    if (updates.length > 0) {
      await ctx.reply(`🆕 Найдено обновлений: ${updates.length}`);
      // Показать список обновлений
    }
  }
});
```

#### Совместимость модов
```typescript
// Проверка совместимости
bot.action(/check_compatibility_(.+)/, async (ctx) => {
  const mods = state.selectedMods;
  const conflicts = await checkModConflicts(mods);
  
  if (conflicts.length > 0) {
    await ctx.reply('⚠️ Обнаружены конфликты:\n' + conflicts.join('\n'));
  } else {
    await ctx.reply('✅ Все моды совместимы!');
  }
});
```

#### Мультиязычность
```typescript
// Поддержка языков
const translations = {
  ru: {
    welcome: '👋 Привет! Я бот для поиска модов.',
    search: '🔍 Поиск',
  },
  en: {
    welcome: '👋 Hello! I am a mod search bot.',
    search: '🔍 Search',
  },
};

bot.command('language', async (ctx) => {
  await ctx.reply('Выбери язык / Choose language:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
        [{ text: '🇬🇧 English', callback_data: 'lang_en' }],
      ],
    },
  });
});
```

## 🎨 UI/UX улучшения

### Inline режим
```typescript
// Поиск прямо из любого чата
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  const results = await searchModrinth(query);
  
  const inlineResults = results.map(mod => ({
    type: 'article',
    id: mod.project_id,
    title: mod.title,
    description: mod.description,
    input_message_content: {
      message_text: `${mod.title}\n${mod.description}\n\nСкачать: ${mod.url}`,
    },
  }));
  
  await ctx.answerInlineQuery(inlineResults);
});
```

### Пагинация результатов
```typescript
// Навигация по страницам
function createPaginatedKeyboard(results: any[], page: number, totalPages: number) {
  const buttons = [];
  
  // Кнопки результатов
  const start = page * 5;
  const end = start + 5;
  results.slice(start, end).forEach((item, i) => {
    buttons.push([Markup.button.callback(`${start + i + 1}. ${item.title}`, `select_${item.id}`)]);
  });
  
  // Навигация
  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️ Назад', `page_${page - 1}`));
  nav.push(Markup.button.callback(`${page + 1}/${totalPages}`, 'noop'));
  if (page < totalPages - 1) nav.push(Markup.button.callback('Вперёд ▶️', `page_${page + 1}`));
  buttons.push(nav);
  
  return Markup.inlineKeyboard(buttons);
}
```

## 📊 Метрики для отслеживания

### KPI
- Количество активных пользователей (DAU/MAU)
- Среднее количество поисков на пользователя
- Конверсия поиск → скачивание
- Retention rate (возвращаемость)
- Средняя длина сессии

### Технические метрики
- Время ответа API
- Процент успешных скачиваний
- Количество ошибок
- Использование rate limit

## 🔧 Технические улучшения

### Кэширование
```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 минут

async function searchWithCache(query: string) {
  const cacheKey = `search_${query}`;
  const cached = cache.get(cacheKey);
  
  if (cached) return cached;
  
  const results = await searchModrinth(query);
  cache.set(cacheKey, results);
  return results;
}
```

### Очередь задач
```typescript
// Для обработки тяжёлых операций
import Bull from 'bull';

const downloadQueue = new Bull('downloads');

downloadQueue.process(async (job) => {
  const { userId, fileUrl } = job.data;
  const file = await downloadFile(fileUrl);
  await sendFileToUser(userId, file);
});

// Добавление в очередь
bot.action(/download_(.+)/, async (ctx) => {
  await downloadQueue.add({ userId, fileUrl });
  await ctx.answerCbQuery('⏳ Файл добавлен в очередь');
});
```

## 🎯 Roadmap

### Q1 2024
- [x] Базовый функционал
- [x] Интеграция Modrinth
- [x] Деплой на Vercel
- [ ] Фильтры поиска
- [ ] Избранное

### Q2 2024
- [ ] Интеграция CurseForge
- [ ] Рейтинги и отзывы
- [ ] Рекомендации
- [ ] Уведомления

### Q3 2024
- [ ] Modpacks
- [ ] Inline режим
- [ ] Мультиязычность
- [ ] Статистика

### Q4 2024
- [ ] Проверка совместимости
- [ ] Автообновление
- [ ] Мобильное приложение
- [ ] API для разработчиков

---

**Хочешь помочь с реализацией?** Смотри [CONTRIBUTING.md](CONTRIBUTING.md)
