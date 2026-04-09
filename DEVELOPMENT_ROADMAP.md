# 🗺️ Roadmap развития проекта MineBridge

---

## 📋 Текущее состояние

**Версия:** 2.0.0  
**Статус:** Production Ready ✅  
**Пользователи:** Активные  
**Стабильность:** Высокая  

### Реализованные функции

- ✅ Поиск модов/шейдеров/ресурспаков
- ✅ Интеграция Modrinth и CurseForge
- ✅ Фильтры по версии и загрузчику
- ✅ Автоматическое скачивание (< 50 МБ)
- ✅ Rate limiting
- ✅ Полная аналитика
- ✅ Админ-панель
- ✅ Inline режим
- ✅ Рассылка новостей
- ✅ Личная статистика

---

## 🎯 Краткосрочные приоритеты (1-2 месяца)

### 1. Рефакторинг кода

**Проблема:** bot.ts содержит 1352 строк кода

**Решение:**
```
src/
├── bot.ts (основной файл)
├── handlers/
│   ├── commands.ts      # /start, /mybot, /mystats, /channel
│   ├── callbacks.ts     # Обработка callback'ов
│   ├── text.ts          # Обработка текстовых сообщений
│   ├── inline.ts        # Inline режим
│   └── channel.ts       # Рассылка новостей
├── services/
│   ├── search.ts        # Логика поиска
│   ├── download.ts      # Логика скачивания
│   ├── stats.ts         # Логика статистики
│   └── admin.ts         # Админ-панель
└── utils/
    ├── keyboards.ts     # Клавиатуры
    ├── formatters.ts    # Форматирование
    └── validators.ts    # Валидация
```

**Преимущества:**
- Легче поддерживать
- Легче тестировать
- Легче добавлять функции
- Лучше читаемость

**Время:** 1-2 недели

---

### 2. Добавить unit тесты

**Структура:**
```
tests/
├── api/
│   ├── modrinth.test.ts
│   └── curseforge.test.ts
├── services/
│   ├── search.test.ts
│   ├── download.test.ts
│   └── stats.test.ts
├── utils/
│   ├── formatters.test.ts
│   └── validators.test.ts
└── fixtures/
    ├── modrinth-responses.ts
    └── curseforge-responses.ts
```

**Примеры тестов:**
```typescript
// tests/api/modrinth.test.ts
describe('Modrinth API', () => {
  it('should search for mods', async () => {
    const results = await searchModrinth('JEI', 'mod');
    expect(results).toHaveLength(10);
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('downloads');
  });

  it('should handle empty results', async () => {
    const results = await searchModrinth('xyzabc123notexist', 'mod');
    expect(results).toEqual([]);
  });

  it('should get versions', async () => {
    const versions = await getModrinthVersions('jei');
    expect(versions.length).toBeGreaterThan(0);
    expect(versions[0]).toHaveProperty('version_number');
  });
});
```

**Инструменты:**
- Jest для unit тестов
- Supertest для API тестов
- Mock для API запросов

**Время:** 2-3 недели

---

### 3. Добавить кэширование

**Redis кэширование:**
```typescript
// src/services/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedSearch(query: string, projectType: string) {
  const cacheKey = `search:${query}:${projectType}`;
  
  // Проверка кэша
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Поиск в API
  const results = await searchModrinth(query, projectType);
  
  // Сохранение в кэш на 10 минут
  await redis.setex(cacheKey, 600, JSON.stringify(results));
  
  return results;
}
```

**Что кэшировать:**
- Результаты поиска (10 минут)
- Версии модов (1 час)
- Информацию о проектах (1 час)

**Преимущества:**
- Быстрее ответы
- Меньше нагрузка на API
- Лучше UX

**Время:** 1 неделя

---

## 🚀 Среднесрочные приоритеты (2-4 месяца)

### 1. Избранное

**Таблица БД:**
```sql
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

**Функции:**
```typescript
// Добавить в избранное
bot.action(/favorite_add_(.+)/, async (ctx) => {
  const projectId = ctx.match[1];
  await addToFavorites(userId, projectId);
  await ctx.answerCbQuery('⭐ Добавлено в избранное!');
});

// Просмотр избранного
bot.command('favorites', async (ctx) => {
  const favorites = await getFavorites(userId);
  // Показать список
});

// Удалить из избранного
bot.action(/favorite_remove_(.+)/, async (ctx) => {
  const projectId = ctx.match[1];
  await removeFromFavorites(userId, projectId);
  await ctx.answerCbQuery('❌ Удалено из избранного');
});
```

**Кнопки:**
```
[⭐ Добавить в избранное] [❌ Удалить]
[📋 Мои избранные]
```

**Время:** 1-2 недели

---

### 2. Рейтинги и отзывы

**Таблица БД:**
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

**Функции:**
```typescript
// Оставить отзыв
bot.action(/rate_(.+)/, async (ctx) => {
  const projectId = ctx.match[1];
  setUserState(userId, { action: 'rating', projectId });
  
  await ctx.editMessageText(
    '⭐ Оцени мод (1-5 звёзд):',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('⭐', 'rating_1'),
        Markup.button.callback('⭐⭐', 'rating_2'),
        Markup.button.callback('⭐⭐⭐', 'rating_3'),
        Markup.button.callback('⭐⭐⭐⭐', 'rating_4'),
        Markup.button.callback('⭐⭐⭐⭐⭐', 'rating_5'),
      ]
    ])
  );
});

// Получить средний рейтинг
async function getAverageRating(projectId: string) {
  const { data } = await supabase
    .from('user_ratings')
    .select('rating')
    .eq('project_id', projectId);
  
  const avg = data?.reduce((sum, r) => sum + r.rating, 0) / data?.length;
  return avg;
}
```

**Время:** 2 недели

---

### 3. Рекомендации

**Алгоритм:**
```typescript
async function getRecommendations(userId: number) {
  // 1. Получить историю поиска пользователя
  const searches = await getSearchHistory(userId);
  
  // 2. Найти похожие моды
  const recommendations = [];
  for (const search of searches) {
    const similar = await findSimilarMods(search.query);
    recommendations.push(...similar);
  }
  
  // 3. Удалить дубликаты и отсортировать
  const unique = [...new Set(recommendations)];
  return unique.slice(0, 10);
}

bot.command('recommendations', async (ctx) => {
  const recs = await getRecommendations(userId);
  // Показать рекомендации
});
```

**Время:** 2-3 недели

---

### 4. Уведомления об обновлениях

**Таблица БД:**
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

**Функции:**
```typescript
// Подписка на обновления
bot.action(/subscribe_(.+)/, async (ctx) => {
  const projectId = ctx.match[1];
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
      await updateSubscription(sub.id, latestVersion);
    }
  }
}

// Запуск каждый час
schedule.scheduleJob('0 * * * *', checkUpdates);
```

**Время:** 2 недели

---

## 🎯 Долгосрочные приоритеты (4-6 месяцев)

### 1. Modpacks (сборки модов)

**Функции:**
```typescript
// Создание сборки
bot.command('create_modpack', async (ctx) => {
  setUserState(userId, { 
    action: 'create_modpack', 
    mods: [],
    name: null 
  });
  await ctx.reply('📦 Введи название сборки:');
});

// Добавление мода в сборку
bot.action(/modpack_add_(.+)/, async (ctx) => {
  const state = userStates.get(userId);
  state.mods.push(ctx.match[1]);
  await ctx.answerCbQuery('✅ Мод добавлен в сборку!');
});

// Экспорт сборки
bot.action('modpack_export', async (ctx) => {
  const state = userStates.get(userId);
  const modpack = createModpackFile(state.mods);
  await ctx.replyWithDocument(modpack);
});
```

**Таблица БД:**
```sql
CREATE TABLE modpacks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  mods JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Время:** 3-4 недели

---

### 2. Проверка совместимости

**Функции:**
```typescript
async function checkModConflicts(mods: string[]) {
  const conflicts = [];
  
  // Получить информацию о каждом моде
  const modInfos = await Promise.all(
    mods.map(id => getModInfo(id))
  );
  
  // Проверить конфликты
  for (let i = 0; i < modInfos.length; i++) {
    for (let j = i + 1; j < modInfos.length; j++) {
      if (hasConflict(modInfos[i], modInfos[j])) {
        conflicts.push({
          mod1: modInfos[i].name,
          mod2: modInfos[j].name,
          reason: 'Конфликт загрузчиков'
        });
      }
    }
  }
  
  return conflicts;
}

bot.action(/check_compatibility_(.+)/, async (ctx) => {
  const mods = state.selectedMods;
  const conflicts = await checkModConflicts(mods);
  
  if (conflicts.length > 0) {
    let message = '⚠️ Обнаружены конфликты:\n\n';
    conflicts.forEach(c => {
      message += `❌ ${c.mod1} ↔️ ${c.mod2}\n`;
      message += `   Причина: ${c.reason}\n\n`;
    });
    await ctx.reply(message);
  } else {
    await ctx.reply('✅ Все моды совместимы!');
  }
});
```

**Время:** 3-4 недели

---

### 3. Мультиязычность

**Структура:**
```typescript
// src/i18n/translations.ts
const translations = {
  ru: {
    welcome: '👋 Привет! Я бот для поиска модов.',
    search: '🔍 Поиск',
    mods: '🔧 Моды',
    shaders: '✨ Шейдеры',
    resourcepacks: '🎨 Ресурспаки',
    // ... остальные строки
  },
  en: {
    welcome: '👋 Hello! I am a mod search bot.',
    search: '🔍 Search',
    mods: '🔧 Mods',
    shaders: '✨ Shaders',
    resourcepacks: '🎨 Resource Packs',
    // ... остальные строки
  },
  es: {
    // Испанский
  },
  fr: {
    // Французский
  },
};

// Использование
function t(key: string, lang: string = 'ru') {
  return translations[lang]?.[key] || translations.ru[key];
}
```

**Команда выбора языка:**
```typescript
bot.command('language', async (ctx) => {
  await ctx.reply('Выбери язык / Choose language:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
        [{ text: '🇬🇧 English', callback_data: 'lang_en' }],
        [{ text: '🇪🇸 Español', callback_data: 'lang_es' }],
        [{ text: '🇫🇷 Français', callback_data: 'lang_fr' }],
      ],
    },
  });
});
```

**Время:** 2-3 недели

---

### 4. Автоматическое обновление модов

**Функции:**
```typescript
// Загрузка списка модов из файла
bot.on('document', async (ctx) => {
  if (ctx.message.document.file_name.endsWith('.txt')) {
    const file = await ctx.telegram.getFileLink(ctx.message.document.file_id);
    const modList = await parseModList(file);
    
    // Проверка обновлений для каждого мода
    const updates = await checkModUpdates(modList);
    
    if (updates.length > 0) {
      let message = `🆕 Найдено обновлений: ${updates.length}\n\n`;
      updates.forEach(u => {
        message += `${u.name}: ${u.oldVersion} → ${u.newVersion}\n`;
      });
      
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📥 Скачать все', callback_data: 'download_all_updates' }],
            [{ text: '❌ Отмена', callback_data: 'cancel' }]
          ]
        }
      });
    } else {
      await ctx.reply('✅ Все моды актуальны!');
    }
  }
});
```

**Время:** 2-3 недели

---

## 📊 Метрики успеха

### Текущие метрики

```
DAU (Daily Active Users): ?
MAU (Monthly Active Users): ?
Среднее поисков на пользователя: ?
Конверсия поиск → скачивание: ?
Retention rate (7 дней): ?
```

### Целевые метрики

```
DAU: > 1000
MAU: > 5000
Среднее поисков: > 3
Конверсия: > 30%
Retention: > 40%
```

---

## 🔧 Технические улучшения

### 1. Мониторинг (Sentry)

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Отслеживание ошибок
try {
  // код
} catch (error) {
  Sentry.captureException(error);
}
```

### 2. Логирование (Winston)

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info('Bot started');
logger.error('Error occurred', error);
```

### 3. Метрики (Prometheus)

```typescript
import prometheus from 'prom-client';

const searchCounter = new prometheus.Counter({
  name: 'bot_searches_total',
  help: 'Total number of searches',
  labelNames: ['type']
});

const downloadCounter = new prometheus.Counter({
  name: 'bot_downloads_total',
  help: 'Total number of downloads'
});

// Использование
searchCounter.inc({ type: 'mod' });
downloadCounter.inc();
```

---

## 📅 График реализации

### Q1 2026 (Январь-Март)

- [x] Текущая версия 2.0.0
- [ ] Рефакторинг кода (неделя 1-2)
- [ ] Unit тесты (неделя 3-4)
- [ ] Кэширование (неделя 5)

### Q2 2026 (Апрель-Июнь)

- [ ] Избранное (неделя 1-2)
- [ ] Рейтинги (неделя 3-4)
- [ ] Рекомендации (неделя 5-6)
- [ ] Уведомления (неделя 7-8)

### Q3 2026 (Июль-Сентябрь)

- [ ] Modpacks (неделя 1-4)
- [ ] Проверка совместимости (неделя 5-8)
- [ ] Мониторинг (неделя 9-10)

### Q4 2026 (Октябрь-Декабрь)

- [ ] Мультиязычность (неделя 1-3)
- [ ] Автообновление (неделя 4-6)
- [ ] Мобильное приложение (неделя 7-12)

---

## 🎓 Выводы

### Сильные стороны текущей версии

✅ Полнофункциональное решение  
✅ Хорошо структурированный код  
✅ Полная документация  
✅ Serverless архитектура  
✅ Масштабируемое решение  

### Приоритеты развития

1. **Краткосрочно:** Рефакторинг и тесты
2. **Среднесрочно:** Новые функции (избранное, рейтинги)
3. **Долгосрочно:** Расширенный функционал (modpacks, совместимость)

### Рекомендации

1. Начать с рефакторинга bot.ts
2. Добавить unit тесты
3. Внедрить кэширование
4. Постепенно добавлять новые функции
5. Мониторить метрики пользователей

---

**Проект готов к развитию и масштабированию!** 🚀

