# 👨‍💻 Руководство разработчика

## 📁 Структура проекта

```
src/
├── bot.ts                    # Главный файл - регистрация handlers
├── config.ts                 # Конфигурация (токены, настройки)
├── database.ts               # Работа с Supabase
├── keyboards.ts              # Клавиатуры Telegram
├── index.ts                  # Entry point
│
├── handlers/                 # Обработчики событий
│   ├── index.ts             # Экспорт всех handlers
│   ├── commands.ts          # Команды: /start, /mybot, /mystats
│   ├── search.ts            # Поиск модов/шейдеров/ресурспаков
│   ├── download.ts          # Скачивание файлов
│   ├── admin.ts             # Админ-панель
│   ├── inline.ts            # Inline режим
│   └── channel.ts           # Рассылка новостей
│
├── services/                 # Бизнес-логика
│   ├── state-service.ts     # Управление состояниями пользователей
│   └── cache-service.ts     # Кэширование с Redis
│
├── types/                    # TypeScript типы
│   └── user.ts              # UserState, SearchResults
│
├── api/                      # Внешние API
│   ├── modrinth.ts          # Modrinth API
│   └── curseforge.ts        # CurseForge API
│
└── utils/                    # Утилиты
    └── download.ts          # Скачивание файлов
```

## 🎯 Как добавить новую функцию

### 1. Создать новый handler

```typescript
// src/handlers/favorites.ts
import { Context } from 'telegraf';
import { supabase } from '../database';

export async function handleAddFavorite(ctx: Context, projectId: string) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Логика добавления в избранное
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, project_id: projectId });

  if (error) {
    return ctx.answerCbQuery('❌ Ошибка');
  }

  await ctx.answerCbQuery('⭐ Добавлено в избранное!');
}
```

### 2. Экспортировать handler

```typescript
// src/handlers/index.ts
export * from './commands';
export * from './search';
export * from './download';
export * from './admin';
export * from './inline';
export * from './channel';
export * from './favorites'; // Новый handler
```

### 3. Зарегистрировать в bot.ts

```typescript
// src/bot.ts
import { handleAddFavorite } from './handlers';

// Добавить action
bot.action(/favorite_add_(.+)/, async (ctx) => {
  const projectId = ctx.match[1];
  await handleAddFavorite(ctx, projectId);
});
```

## 🔧 Как добавить новый сервис

### 1. Создать сервис

```typescript
// src/services/recommendation-service.ts
class RecommendationService {
  async getRecommendations(userId: number, limit: number = 10) {
    // Логика рекомендаций
    return [];
  }
}

export const recommendationService = new RecommendationService();
```

### 2. Использовать в handler

```typescript
// src/handlers/recommendations.ts
import { recommendationService } from '../services/recommendation-service';

export async function handleRecommendations(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const recs = await recommendationService.getRecommendations(userId);
  
  // Отправить рекомендации
  await ctx.reply(`💡 Рекомендации: ${recs.length}`);
}
```

## 📊 Работа с состояниями

### Установить состояние

```typescript
import { stateService } from '../services/state-service';

stateService.setUserState(userId, {
  action: 'waiting_input',
  projectType: 'mod',
  gameVersion: '1.20.1'
});
```

### Получить состояние

```typescript
const state = stateService.getUserState(userId);
if (!state) return;

console.log(state.action); // 'waiting_input'
console.log(state.projectType); // 'mod'
```

### Удалить состояние

```typescript
stateService.deleteUserState(userId);
```

## 💾 Работа с кэшем

### Кэширование поиска

```typescript
import { cacheService } from '../services/cache-service';

const results = await cacheService.getOrSearchMods(
  query,
  'mod',
  () => searchModrinth(query, 'mod') // Fallback функция
);
```

### Кэширование версий

```typescript
const versions = await cacheService.getOrFetchVersions(
  projectId,
  () => getModrinthVersions(projectId)
);
```

### Инвалидация кэша

```typescript
// Удалить все кэши поиска
await cacheService.invalidate('search:*');

// Удалить кэш конкретного проекта
await cacheService.invalidate(`versions:${projectId}`);
```

## 🗄️ Работа с базой данных

### Добавить запись

```typescript
import { supabase } from '../database';

const { data, error } = await supabase
  .from('favorites')
  .insert({
    user_id: userId,
    project_id: projectId,
    project_name: 'JEI'
  });
```

### Получить записи

```typescript
const { data, error } = await supabase
  .from('favorites')
  .select('*')
  .eq('user_id', userId);
```

### Обновить запись

```typescript
const { error } = await supabase
  .from('favorites')
  .update({ project_name: 'New Name' })
  .eq('id', favoriteId);
```

### Удалить запись

```typescript
const { error } = await supabase
  .from('favorites')
  .delete()
  .eq('user_id', userId)
  .eq('project_id', projectId);
```

## ⌨️ Создание клавиатур

### Inline клавиатура

```typescript
import { Markup } from 'telegraf';

const keyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('⭐ Добавить', `favorite_add_${projectId}`),
    Markup.button.callback('📥 Скачать', `download_${projectId}`)
  ],
  [
    Markup.button.callback('« Назад', 'main_menu')
  ]
]);

await ctx.reply('Выбери действие:', keyboard);
```

### Reply клавиатура

```typescript
const keyboard = Markup.keyboard([
  ['🔧 Моды', '✨ Шейдеры'],
  ['🎨 Ресурспаки', '🔍 Поиск']
]).resize();

await ctx.reply('Главное меню:', keyboard);
```

## 🧪 Тестирование

### Проверка типов

```bash
npm run type-check
```

### Сборка

```bash
npm run build
```

### Запуск в dev режиме

```bash
npm run dev
```

## 📝 Best Practices

### 1. Всегда проверяйте userId

```typescript
const userId = ctx.from?.id;
if (!userId) return;
```

### 2. Обрабатывайте ошибки

```typescript
try {
  await someAsyncOperation();
} catch (error) {
  console.error('Error:', error);
  await ctx.reply('❌ Произошла ошибка');
}
```

### 3. Используйте answerCbQuery

```typescript
bot.action('some_action', async (ctx) => {
  await ctx.answerCbQuery('⏳ Загружаю...');
  // Ваш код
});
```

### 4. Логируйте важные события

```typescript
console.log('🔍 Search:', { userId, query, results: results.length });
```

### 5. Используйте типизацию

```typescript
interface MyData {
  id: string;
  name: string;
}

const data: MyData = { id: '123', name: 'Test' };
```

## 🚀 Деплой

### Vercel

```bash
# Установить Vercel CLI
npm i -g vercel

# Деплой
vercel --prod
```

### Переменные окружения

```env
TELEGRAM_BOT_TOKEN=your_token
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
REDIS_URL=redis://localhost:6379  # Опционально
CURSEFORGE_API_KEY=your_key        # Опционально
```

## 📚 Полезные ссылки

- [Telegraf Documentation](https://telegraf.js.org/)
- [Supabase Documentation](https://supabase.com/docs)
- [Redis Documentation](https://redis.io/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
