# 🔧 Технические детали проекта MineBridge

---

## 📦 Зависимости проекта

### Production Dependencies

```json
{
  "telegraf": "^4.16.3",           // Telegram Bot Framework
  "@supabase/supabase-js": "^2.39.7", // PostgreSQL Client
  "axios": "^1.6.7",               // HTTP Client
  "dotenv": "^16.4.1",             // Environment Variables
  "@vercel/node": "^3.0.21"        // Vercel Runtime
}
```

### Development Dependencies

```json
{
  "@types/node": "^20.11.16",      // Node.js Types
  "typescript": "^5.3.3",          // TypeScript Compiler
  "tsx": "^4.7.1"                  // TypeScript Executor
}
```

### Next.js Dependencies

```json
{
  "next": "^15.1.6",               // React Framework
  "react": "^18.3.1",              // UI Library
  "react-dom": "^18.3.1",          // DOM Renderer
  "tailwindcss": "^3.4.17",        // CSS Framework
  "@radix-ui/react-*": "^1.x",     // UI Components
  "@tanstack/react-query": "^5.90.21", // State Management
  "framer-motion": "^12.34.0"      // Animations
}
```

---

## 🗄️ Структура базы данных

### Таблица: user_requests

```sql
CREATE TABLE user_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  request_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_requests_user_timestamp 
ON user_requests(user_id, timestamp DESC);
```

**Назначение:** Логирование всех запросов пользователей для rate limiting и аналитики

**Примеры request_type:**
- `search_mod` — поиск модов
- `search_shader` — поиск шейдеров
- `search_resourcepack` — поиск ресурспаков
- `search_custom` — кастомный поиск
- `download` — скачивание файла
- `news_broadcast` — рассылка новостей

---

### Таблица: search_history

```sql
CREATE TABLE search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  query TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_history_user 
ON search_history(user_id, timestamp DESC);
```

**Назначение:** Хранение истории поиска для аналитики и рекомендаций

**Примеры:**
```
query: "JEI"
result_count: 42

query: "Sodium"
result_count: 15
```

---

### Таблица: download_stats

```sql
CREATE TABLE download_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_name TEXT NOT NULL,
  project_id TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_download_stats_user 
ON download_stats(user_id, timestamp DESC);
```

**Назначение:** Статистика скачиваний для аналитики

**Примеры:**
```
project_name: "Just Enough Items (JEI)"
project_id: "jei"
file_size: 1258291
source: "modrinth"

project_name: "Sodium"
project_id: "sodium"
file_size: 2097152
source: "modrinth"
```

---

### Таблица: user_bots

```sql
CREATE TABLE user_bots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  bot_token TEXT NOT NULL,
  bot_username TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ,
  UNIQUE(user_id)
);
```

**Назначение:** Хранение информации о пользовательских ботах

---

## 🔌 API Endpoints

### Telegram Bot Webhook

**POST /api/webhook**
```
Получает updates от Telegram
Обрабатывает сообщения, callback'и, inline запросы
Timeout: 25 секунд
```

**GET /api/webhook**
```
Устанавливает webhook для бота
Возвращает статус установки
```

---

### Next.js API Routes

**GET /api/search**
```typescript
Query Parameters:
- query: string (обязательный)
- category: string (mod|shader|resourcepack)
- gameVersion?: string
- loader?: string
- page?: number

Response:
{
  results: Array<{
    id: string
    title: string
    description: string
    downloads: number
    icon_url?: string
    source: "modrinth" | "curseforge"
  }>
  total: number
  page: number
}
```

**GET /api/item/[itemId]**
```typescript
Path Parameters:
- itemId: string (project ID)

Response:
{
  id: string
  title: string
  description: string
  downloads: number
  icon_url?: string
  versions: string[]
  loaders: string[]
  links: {
    modrinth?: string
    curseforge?: string
  }
}
```

**GET /api/versions/[itemId]**
```typescript
Path Parameters:
- itemId: string (project ID)

Response:
{
  versions: Array<{
    id: string
    name: string
    version_number: string
    game_versions: string[]
    loaders: string[]
    files: Array<{
      url: string
      filename: string
      size: number
    }>
  }>
}
```

---

## 🔐 Переменные окружения

### Обязательные

```env
# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Vercel
WEBHOOK_DOMAIN=your-project.vercel.app
```

### Опциональные

```env
# CurseForge (для поиска в CurseForge)
CURSEFORGE_API_KEY=your-api-key-here
```

---

## 🎯 Типы данных

### ModrinthProject

```typescript
interface ModrinthProject {
  slug: string;                    // Уникальный идентификатор
  title: string;                   // Название проекта
  description: string;             // Описание
  project_type: string;            // mod|shader|resourcepack
  downloads: number;               // Количество загрузок
  icon_url?: string;               // URL иконки
  project_id: string;              // ID проекта
}
```

### ModrinthVersion

```typescript
interface ModrinthVersion {
  id: string;                      // ID версии
  name: string;                    // Название версии
  version_number: string;          // Номер версии (1.20.1)
  game_versions: string[];         // Поддерживаемые версии
  loaders: string[];               // Загрузчики (forge, fabric)
  files: Array<{
    url: string;                   // URL для скачивания
    filename: string;              // Имя файла
    size: number;                  // Размер в байтах
  }>;
}
```

### CurseForgeProject

```typescript
interface CurseForgeProject {
  id: number;                      // ID проекта
  name: string;                    // Название
  summary: string;                 // Краткое описание
  downloadCount: number;           // Количество загрузок
  logo?: {
    url: string;                   // URL логотипа
  };
  links: {
    websiteUrl: string;            // Ссылка на проект
  };
}
```

### CurseForgeFile

```typescript
interface CurseForgeFile {
  id: number;                      // ID файла
  displayName: string;             // Название файла
  fileName: string;                // Имя файла
  fileLength: number;              // Размер в байтах
  downloadUrl: string;             // URL для скачивания
  gameVersions: string[];          // Поддерживаемые версии
}
```

### UserState

```typescript
interface UserState {
  action: string;                  // Текущее действие
  data?: any;                      // Дополнительные данные
  projectId?: string;              // ID проекта
  projectType?: string;            // mod|shader|resourcepack
  gameVersion?: string;            // Версия Minecraft
  loader?: string;                 // Загрузчик
  results?: any[];                 // Результаты поиска
  currentPage?: number;            // Текущая страница
  timestamp: number;               // Время создания состояния
}
```

---

## 🔄 Процессы и workflows

### Процесс поиска мода

```
1. Пользователь вводит запрос
   ↓
2. Проверка rate limit
   ↓
3. Запрос к Modrinth API
   ↓
4. Запрос к CurseForge API (если есть ключ)
   ↓
5. Объединение результатов
   ↓
6. Фильтрация по версии/загрузчику
   ↓
7. Сохранение в search_history
   ↓
8. Форматирование результатов
   ↓
9. Отправка пользователю
   ↓
10. Логирование в user_requests
```

### Процесс скачивания файла

```
1. Пользователь выбирает версию
   ↓
2. Получение информации о файле
   ↓
3. Проверка размера файла
   ↓
4. Если < 50 МБ:
   a. Скачивание в буфер
   b. Отправка документа
   ↓
5. Если > 50 МБ:
   a. Отправка прямой ссылки
   ↓
6. Логирование в download_stats
```

### Процесс рассылки новостей

```
1. Администратор постит в канал
   ↓
2. Telegram отправляет channel_post update
   ↓
3. Бот получает update
   ↓
4. Проверка ID канала
   ↓
5. Получение всех уникальных пользователей
   ↓
6. Для каждого пользователя:
   a. Пересылка поста
   b. Отправка ссылки на канал
   c. Задержка 35 мс (rate limit)
   ↓
7. Логирование статистики
```

---

## ⚙️ Конфигурация

### config.ts

```typescript
export const config = {
  telegramToken: string;           // Токен бота
  curseforgeApiKey: string;        // API ключ CurseForge
  supabaseUrl: string;             // URL Supabase
  supabaseKey: string;             // Ключ Supabase
  webhookDomain: string;           // Домен для webhook
  maxFileSize: 50 * 1024 * 1024;   // 50 МБ
  rateLimitRequests: 3;            // 3 запроса
  rateLimitWindow: 60000;          // за 1 минуту
  adminUserId: 7839251308;         // ID администратора
  newsChannelId: -1003753906519;   // ID канала новостей
  newsChannelLink: string;         // Ссылка на канал
};
```

---

## 🎨 Клавиатуры и кнопки

### Главное меню

```
[🔧 Моды] [✨ Шейдеры]
[🎨 Ресурспаки] [🔍 Поиск]
[📢 Канал] [📈 Моя статистика]
[👥 О авторах]
[📊 Админ] (только для админа)
```

### Выбор версии Minecraft

```
[1.20.4] [1.20.1]
[1.19.4] [1.18.2]
[Любая версия] [Своя версия]
```

### Выбор загрузчика (моды)

```
[Forge] [Fabric]
[Quilt] [NeoForge]
[Любой] [Свой]
```

### Выбор загрузчика (шейдеры)

```
[Optifine] [Iris]
[Любой] [Свой]
```

### Результаты поиска

```
[1. Мод 1] [2. Мод 2] [3. Мод 3]
[4. Мод 4] [5. Мод 5]
[◀️ Назад] [1/5] [Вперёд ▶️]
```

### Версии мода

```
[1. Версия 1] [2. Версия 2]
[3. Версия 3] [4. Версия 4]
[5. Версия 5]
[« Назад в меню]
```

---

## 📊 Примеры запросов к БД

### Получить топ пользователей за неделю

```sql
SELECT 
  user_id,
  username,
  COUNT(*) as count
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY user_id, username
ORDER BY count DESC
LIMIT 10;
```

### Получить популярные запросы

```sql
SELECT 
  query,
  COUNT(*) as count
FROM search_history
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY count DESC
LIMIT 15;
```

### Получить активность по часам

```sql
SELECT 
  EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC') as hour,
  COUNT(*) as count
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

### Получить статистику скачиваний

```sql
SELECT 
  project_name,
  COUNT(*) as downloads,
  SUM(file_size) as total_size,
  AVG(file_size) as avg_size
FROM download_stats
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY project_name
ORDER BY downloads DESC
LIMIT 10;
```

---

## 🔍 Примеры API запросов

### Поиск в Modrinth

```bash
GET https://api.modrinth.com/v2/search?query=JEI&facets=[["project_type:mod"]]&limit=10

Response:
{
  "hits": [
    {
      "slug": "jei",
      "title": "Just Enough Items (JEI)",
      "description": "Item and Recipe viewing mod",
      "project_type": "mod",
      "downloads": 150000000,
      "icon_url": "https://...",
      "project_id": "..."
    }
  ]
}
```

### Получить версии в Modrinth

```bash
GET https://api.modrinth.com/v2/project/jei/version

Response:
[
  {
    "id": "...",
    "name": "15.2.0.27",
    "version_number": "15.2.0.27",
    "game_versions": ["1.20.1"],
    "loaders": ["forge", "fabric"],
    "files": [
      {
        "url": "https://...",
        "filename": "jei-1.20.1-forge-15.2.0.27.jar",
        "size": 1258291
      }
    ]
  }
]
```

### Поиск в CurseForge

```bash
GET https://api.curseforge.com/v1/mods/search \
  -H "x-api-key: YOUR_API_KEY" \
  -d "gameId=432&classId=6&searchFilter=JEI&pageSize=10"

Response:
{
  "data": [
    {
      "id": 238222,
      "name": "Just Enough Items (JEI)",
      "summary": "Item and Recipe viewing mod",
      "downloadCount": 150000000,
      "logo": {
        "url": "https://..."
      },
      "links": {
        "websiteUrl": "https://..."
      }
    }
  ]
}
```

---

## 🚀 Оптимизация и масштабирование

### Текущие оптимизации

1. **Кэширование состояния в памяти**
   ```typescript
   const userStates = new Map<number, UserState>();
   // Автоочистка каждые 10 минут
   ```

2. **Индексы в БД**
   ```sql
   CREATE INDEX idx_user_requests_user_timestamp 
   ON user_requests(user_id, timestamp DESC);
   ```

3. **Лимиты результатов**
   - Поиск: 10 результатов
   - Версии: 5 результатов
   - Пагинация: 5 на странице

4. **Timeout для API**
   - 30 секунд для всех запросов

### Возможные оптимизации

1. **Redis кэширование**
   ```typescript
   // Кэширование результатов поиска на 10 минут
   const cache = new Redis();
   const cacheKey = `search:${query}:${projectType}`;
   ```

2. **Batch запросы**
   ```typescript
   // Получение нескольких версий одновременно
   const versions = await Promise.all(
     projectIds.map(id => getModrinthVersions(id))
   );
   ```

3. **Пулинг соединений**
   ```typescript
   // Переиспользование HTTP соединений
   const agent = new http.Agent({ keepAlive: true });
   ```

4. **Сжатие данных**
   ```typescript
   // Сжатие больших ответов
   app.use(compression());
   ```

---

## 🧪 Тестирование

### Unit тесты (рекомендуется добавить)

```typescript
// tests/api/modrinth.test.ts
describe('Modrinth API', () => {
  it('should search for mods', async () => {
    const results = await searchModrinth('JEI', 'mod');
    expect(results).toHaveLength(10);
    expect(results[0]).toHaveProperty('title');
  });

  it('should get versions', async () => {
    const versions = await getModrinthVersions('jei');
    expect(versions.length).toBeGreaterThan(0);
    expect(versions[0]).toHaveProperty('version_number');
  });
});
```

### Интеграционные тесты (рекомендуется добавить)

```typescript
// tests/bot.test.ts
describe('Bot', () => {
  it('should handle /start command', async () => {
    const ctx = createMockContext();
    await bot.command('start')(ctx);
    expect(ctx.reply).toHaveBeenCalled();
  });

  it('should check rate limit', async () => {
    const userId = 123;
    const result1 = await checkRateLimit(userId);
    expect(result1).toBe(true);
  });
});
```

---

## 📈 Мониторинг и логирование

### Текущее логирование

```typescript
console.log('🔍 BOT VERSION: 2.0.0 - 10.02.2026 14:30');
console.log('🔍 WEBHOOK VERSION: 2.2.0 - 10.02.2026 18:40');
console.log('📢 Received channel_post update:', {...});
console.error('Bot error:', error);
```

### Рекомендуемое логирование (Sentry)

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

try {
  // код
} catch (error) {
  Sentry.captureException(error);
}
```

---

## 🔐 Безопасность

### Текущие меры

1. **Rate limiting** — 3 запроса/минуту
2. **Переменные окружения** — все секреты в .env
3. **Row Level Security** — в Supabase
4. **Timeout** — для всех API запросов
5. **Обработка ошибок** — graceful degradation

### Рекомендуемые меры

1. **HTTPS** — все запросы через HTTPS
2. **CORS** — ограничение источников
3. **Input validation** — проверка входных данных
4. **SQL injection prevention** — использование параметризованных запросов
5. **Rate limiting на уровне IP** — для API endpoints

---

## 📝 Версионирование

### Текущие версии

- **Bot:** 2.0.0 (10.02.2026 14:30)
- **Webhook:** 2.2.0 (10.02.2026 18:40)
- **Node.js:** 18+
- **TypeScript:** 5.3.3

### Семантическое версионирование

```
MAJOR.MINOR.PATCH

MAJOR — несовместимые изменения
MINOR — новые функции (совместимые)
PATCH — исправления ошибок
```

---

**Документ содержит полные технические детали проекта!** 📚

