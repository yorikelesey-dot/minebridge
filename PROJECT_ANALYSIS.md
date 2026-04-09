# 📊 Подробный анализ проекта MineBridge

**Дата анализа:** 10 февраля 2026  
**Версия проекта:** 2.0.0  
**Язык:** TypeScript  
**Платформа:** Vercel (Serverless)

---

## 🎯 Обзор проекта

**MineBridge** — это полнофункциональный Telegram-бот для поиска и скачивания модов, шейдеров и ресурспаков Minecraft. Проект состоит из двух основных компонентов:

1. **Telegram Bot** — основной бот для взаимодействия с пользователями
2. **Next.js Website** — веб-сайт для поиска и просмотра модов

### Ключевые характеристики:
- ✅ Поиск в Modrinth и CurseForge API
- ✅ Автоматическое скачивание файлов до 50 МБ
- ✅ Rate limiting (3 запроса/минуту)
- ✅ Полная аналитика в Supabase
- ✅ Serverless архитектура на Vercel
- ✅ Webhook вместо long polling
- ✅ Поддержка фильтров по версии и загрузчику
- ✅ Inline режим для поиска из любого чата
- ✅ Админ-панель со статистикой

---

## 📁 Структура проекта

```
minecraft-mods-bot/
├── api/
│   └── webhook.ts                    # Vercel serverless endpoint
│
├── src/
│   ├── api/
│   │   ├── modrinth.ts              # Modrinth API клиент
│   │   └── curseforge.ts            # CurseForge API клиент
│   │
│   ├── utils/
│   │   ├── download.ts              # Скачивание файлов
│   │   └── helpers.ts               # Вспомогательные функции
│   │
│   ├── bot.ts                        # Основная логика бота (1352 строк)
│   ├── config.ts                     # Конфигурация
│   ├── database.ts                   # Supabase интеграция
│   ├── keyboards.ts                  # Inline клавиатуры
│   └── index.ts                      # Dev entry point
│
├── MineBridges SITE/                 # Next.js веб-приложение
│   ├── app/
│   │   ├── api/                      # API routes
│   │   │   ├── search/               # Поиск модов
│   │   │   ├── modrinth/             # Modrinth API
│   │   │   ├── curseforge/           # CurseForge API
│   │   │   ├── item/                 # Детали мода
│   │   │   └── versions/             # Версии мода
│   │   ├── item/[id]/                # Страница мода
│   │   ├── layout.tsx                # Главный layout
│   │   └── page.tsx                  # Главная страница
│   │
│   ├── components/                   # React компоненты
│   │   ├── ui/                       # UI компоненты (Radix UI)
│   │   ├── search-bar.tsx
│   │   ├── content-grid.tsx
│   │   ├── filter-panel.tsx
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── types.ts                  # TypeScript типы
│   │   ├── transformers.ts           # Трансформация данных
│   │   └── utils.ts                  # Утилиты
│   │
│   └── package.json                  # Next.js зависимости
│
├── supabase-setup.sql                # SQL для инициализации БД
├── supabase-analytics.sql            # SQL для аналитики
├── user-bots-setup.sql               # SQL для пользовательских ботов
├── vercel.json                       # Конфигурация Vercel
├── package.json                      # Основные зависимости
├── tsconfig.json                     # TypeScript конфиг
└── README.md                         # Документация
```

---

## 🔧 Технологический стек

### Backend (Telegram Bot)
- **Telegraf 4.16.3** — фреймворк для Telegram ботов
- **TypeScript 5.3.3** — типизированный JavaScript
- **Axios 1.6.7** — HTTP клиент для API запросов
- **Supabase JS 2.39.7** — клиент для PostgreSQL БД
- **Dotenv 16.4.1** — управление переменными окружения

### Frontend (Next.js Website)
- **Next.js 15.1.6** — React фреймворк
- **React 18.3.1** — UI библиотека
- **Tailwind CSS 3.4.17** — CSS фреймворк
- **Radix UI** — компоненты UI
- **React Query 5.90.21** — управление состоянием
- **Framer Motion 12.34.0** — анимации

### Инфраструктура
- **Vercel** — хостинг и деплой
- **Supabase** — PostgreSQL БД + аутентификация
- **Modrinth API** — поиск модов (публичный)
- **CurseForge API** — поиск модов (требует ключ)

---

## 🤖 Telegram Bot: Архитектура

### Основные компоненты

#### 1. **Точка входа (api/webhook.ts)**
```typescript
// Vercel serverless function
- Получает webhook от Telegram
- Обрабатывает update с timeout защитой (25 сек)
- Устанавливает webhook при GET запросе
- Поддерживает channel_post для рассылки новостей
```

#### 2. **Основная логика (src/bot.ts)**
- **1352 строк кода** с полной логикой бота
- Управление состоянием пользователей (Map)
- Обработка команд и callback'ов
- Интеграция с API
- Логирование в Supabase

#### 3. **API клиенты**

**Modrinth API (src/api/modrinth.ts)**
```typescript
- searchModrinth(query, projectType) → ModrinthProject[]
- getModrinthVersions(projectId) → ModrinthVersion[]
- Поддерживает: mod, shader, resourcepack
- Без API ключа (публичный)
```

**CurseForge API (src/api/curseforge.ts)**
```typescript
- searchCurseForge(query, classId) → CurseForgeProject[]
- getCurseForgeFiles(modId) → CurseForgeFile[]
- Требует API ключ
- classId: 6 (Mods), 12 (Resource Packs), 6552 (Shaders)
```

#### 4. **База данных (src/database.ts)**

**Таблицы:**
- `user_requests` — логирование всех запросов
- `search_history` — история поиска
- `download_stats` — статистика скачиваний
- `user_bots` — пользовательские боты

**Функции:**
```typescript
checkRateLimit(userId) → boolean
logRequest(userId, username, requestType) → void
saveSearchHistory(userId, query, resultCount) → void
getStats() → StatsData
getTopUsers(limit) → TopUser[]
getPopularSearches(limit) → PopularSearch[]
getActivityByHour() → number[]
logDownload(userId, projectName, projectId, fileSize, source) → void
getDownloadStats() → DownloadStats
```

---

## 📱 Пользовательские сценарии

### Сценарий 1: Поиск мода

```
1. Пользователь: /start
   ↓
2. Бот: Главное меню с кнопками
   ↓
3. Пользователь: Нажимает "🔧 Моды"
   ↓
4. Бот: Проверка rate limit → Запрос версии Minecraft
   ↓
5. Пользователь: Выбирает версию (1.20.1)
   ↓
6. Бот: Запрос загрузчика (Forge/Fabric/Quilt)
   ↓
7. Пользователь: Выбирает Forge
   ↓
8. Бот: Запрос названия мода
   ↓
9. Пользователь: Вводит "JEI"
   ↓
10. Бот: Поиск в Modrinth API
    ↓
11. Бот: Фильтрация по версии и загрузчику
    ↓
12. Бот: Отправка результатов (до 5 на странице)
    ↓
13. Пользователь: Выбирает мод
    ↓
14. Бот: Загрузка версий мода
    ↓
15. Пользователь: Выбирает версию
    ↓
16. Бот: Проверка размера файла
    ↓
17. Если < 50 МБ: Скачивание и отправка
    Если > 50 МБ: Отправка прямой ссылки
```

### Сценарий 2: Rate Limiting

```
Пользователь делает 3 запроса за минуту → OK
Пользователь делает 4-й запрос → ❌ Блокировка
Через 60 секунд → Счётчик сбрасывается → OK
```

### Сценарий 3: Рассылка новостей

```
1. Администратор постит в канал
   ↓
2. Telegram отправляет channel_post update
   ↓
3. Бот получает update
   ↓
4. Бот получает всех уникальных пользователей из БД
   ↓
5. Бот пересылает пост каждому пользователю
   ↓
6. Добавляет ссылку на канал
   ↓
7. Логирует статистику рассылки
```

---

## 🌐 Next.js Website: Архитектура

### API Routes

**GET /api/search**
```typescript
Параметры:
- query: string (поисковый запрос)
- category: string (mod/shader/resourcepack)
- gameVersion?: string (фильтр по версии)
- loader?: string (фильтр по загрузчику)

Возвращает:
- Результаты из Modrinth и CurseForge
- Объединённые и отсортированные
```

**GET /api/item/[itemId]**
```typescript
Получает детали мода:
- Название, описание, иконка
- Количество загрузок
- Ссылка на проект
- Поддерживаемые версии
```

**GET /api/versions/[itemId]**
```typescript
Получает все версии мода:
- Номер версии
- Поддерживаемые версии Minecraft
- Загрузчики
- Ссылки на скачивание
```

### React компоненты

- **SearchBar** — поиск модов
- **ContentGrid** — сетка результатов
- **FilterPanel** — фильтры по версии/загрузчику
- **ContentCard** — карточка мода
- **VersionSelector** — выбор версии
- **SkeletonGrid** — загрузочные скелеты

---

## 🔐 Безопасность

### Rate Limiting
```typescript
// 3 запроса в минуту на пользователя
const rateLimitRequests = 3;
const rateLimitWindow = 60000; // 1 минута

// Проверка в БД
SELECT COUNT(*) FROM user_requests
WHERE user_id = ? AND timestamp > NOW() - INTERVAL '1 minute'
```

### Переменные окружения
```env
TELEGRAM_BOT_TOKEN=xxx          # Токен бота
CURSEFORGE_API_KEY=xxx          # API ключ CurseForge
SUPABASE_URL=https://...        # URL Supabase
SUPABASE_KEY=xxx                # Публичный ключ Supabase
WEBHOOK_DOMAIN=xxx.vercel.app   # Домен для webhook
```

### Row Level Security (RLS)
```sql
-- Только сервис может читать/писать
CREATE POLICY "Service role full access" 
ON user_requests FOR ALL 
TO service_role
USING (true);
```

---

## 📊 Аналитика и мониторинг

### Собираемые данные

**user_requests**
- user_id, username
- request_type (search_mod, search_shader, etc.)
- timestamp

**search_history**
- user_id, query
- result_count
- timestamp

**download_stats**
- user_id, project_name, project_id
- file_size, source (modrinth/curseforge)
- timestamp

### Метрики

```typescript
// Общая статистика
- Всего пользователей
- Активных за 24 часа
- Всего запросов
- Запросов за 24 часа
- Всего поисков
- Поисков за 24 часа

// Топ данные
- Топ-10 пользователей (за неделю)
- Топ-15 популярных запросов (за неделю)
- Топ-10 популярных модов (за неделю)

// Активность
- График активности по часам (24 часа)
- Скачивания за 24 часа
- Средний размер файла
- Всего передано данных
```

---

## ⚡ Производительность

### Оптимизации

1. **Кэширование состояния**
   - Map для хранения состояния пользователей
   - Автоочистка старше 1 часа

2. **Индексы в БД**
   ```sql
   CREATE INDEX idx_user_requests_user_timestamp 
   ON user_requests(user_id, timestamp DESC);
   ```

3. **Timeout для API**
   - Modrinth: 30 сек
   - CurseForge: 30 сек
   - Скачивание файлов: 30 сек

4. **Лимиты результатов**
   - Поиск: 10 результатов
   - Версии: 5 результатов
   - Пагинация: 5 на странице

### Метрики производительности

- **Время ответа:** < 2 сек
- **Холодный старт Vercel:** ~200-500 мс
- **Timeout webhook:** 25 сек
- **Лимит выполнения:** 10 сек (Hobby), 60 сек (Pro)

---

## 🚀 Деплой и CI/CD

### Vercel конфигурация

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "public",
  "crons": [
    {
      "path": "/api/cleanup",
      "schedule": "0 3 * * *"  // Каждый день в 3:00 UTC
    }
  ]
}
```

### Процесс деплоя

```bash
1. npm run build          # Компиляция TypeScript
2. git push              # Коммит в GitHub
3. Vercel автоматически:
   - Загружает файлы
   - Собирает проект
   - Создаёт serverless функции
   - Устанавливает webhook
```

---

## 🔄 Жизненный цикл запроса

### Webhook обработка

```
1. Telegram отправляет update
   ↓
2. Vercel получает POST /api/webhook
   ↓
3. api/webhook.ts обрабатывает
   ↓
4. bot.handleUpdate(req.body)
   ↓
5. Telegraf маршрутизирует
   ↓
6. Handler выполняется
   ↓
7. Взаимодействие с API/БД
   ↓
8. Отправка ответа пользователю
   ↓
9. Возврат 200 OK в Telegram
   ↓
10. Serverless функция завершается
```

### Время выполнения

- **Холодный старт:** ~200-500 мс
- **Обработка update:** ~100-500 мс
- **API запрос:** ~500-2000 мс
- **Отправка ответа:** ~100-200 мс
- **Всего:** ~1-3 сек

---

## 📈 Масштабирование

### Текущие лимиты

**Vercel Free:**
- 100 GB bandwidth/месяц
- 100 часов выполнения/месяц
- Unlimited requests

**Supabase Free:**
- 500 MB database
- 1 GB bandwidth/месяц
- 50,000 monthly active users

### Когда нужно масштабировать?

1. **> 10,000 пользователей/месяц**
   - Upgrade Vercel to Pro ($20/мес)

2. **> 500 MB данных в БД**
   - Upgrade Supabase to Pro ($25/мес)

3. **> 1000 req/hour к CurseForge**
   - Кэширование результатов
   - Redis для кэша

---

## 🎯 Функции и возможности

### ✅ Реализованные

- Поиск модов/шейдеров/ресурспаков
- Фильтры по версии и загрузчику
- Автоматическое скачивание (< 50 МБ)
- Прямые ссылки (> 50 МБ)
- Rate limiting
- Полная аналитика
- Админ-панель
- Inline режим
- Рассылка новостей
- Личная статистика
- Пользовательские боты

### 🚧 Планируемые

- Избранное
- Рейтинги и отзывы
- Рекомендации
- Уведомления об обновлениях
- Modpacks (сборки модов)
- Проверка совместимости
- Мультиязычность
- Автоматическое обновление модов

---

## 📝 Команды и кнопки

### Команды бота

```
/start              - Главное меню
/mybot              - Управление своим ботом
/mystats            - Личная статистика
/channel            - Информация о канале
```

### Кнопки главного меню

```
🔧 Моды             - Поиск модов
✨ Шейдеры          - Поиск шейдеров
🎨 Ресурспаки       - Поиск ресурспаков
🔍 Поиск            - Кастомный поиск
📢 Канал            - Ссылка на канал
📈 Моя статистика   - Личная статистика
👥 О авторах        - Информация о проекте
📊 Админ            - Админ-панель (только для админа)
```

---

## 🐛 Обработка ошибок

### Стратегия

1. **Try-catch блоки** — обработка всех ошибок
2. **Graceful degradation** — продолжение работы при ошибках
3. **Логирование** — все ошибки логируются в консоль
4. **Пользовательские сообщения** — понятные ошибки для пользователя

### Примеры

```typescript
// Ошибка API
if (results.length === 0) {
  await ctx.reply('😔 Ничего не найдено');
}

// Ошибка скачивания
if (!buffer) {
  await ctx.reply('❌ Ошибка скачивания. Вот прямая ссылка: ...');
}

// Ошибка rate limit
if (!(await checkRateLimit(userId))) {
  return ctx.reply('⏳ Слишком много запросов. Подожди минуту.');
}
```

---

## 🔗 Интеграции

### Telegram Bot API
- Webhook для получения updates
- Отправка сообщений
- Inline клавиатуры
- Пересылка сообщений
- Отправка документов

### Modrinth API
- Поиск проектов
- Получение версий
- Скачивание файлов
- Без аутентификации

### CurseForge API
- Поиск проектов
- Получение файлов
- Требует API ключ
- Rate limit: 1000 req/hour

### Supabase
- PostgreSQL БД
- Row Level Security
- Аутентификация
- Real-time subscriptions

---

## 📚 Документация

### Основные файлы

- **README.md** — полная документация
- **START_HERE.md** — быстрый старт
- **ARCHITECTURE.md** — архитектура системы
- **WORKFLOW.md** — рабочие процессы
- **FEATURES.md** — функции и roadmap
- **SETUP_GUIDE.md** — подробная настройка
- **SUPABASE_GUIDE.md** — настройка БД

---

## 🎓 Выводы

### Сильные стороны

✅ Полнофункциональное решение  
✅ Хорошо структурированный код  
✅ Полная документация  
✅ Serverless архитектура  
✅ Масштабируемое решение  
✅ Хорошая обработка ошибок  
✅ Полная аналитика  

### Области для улучшения

⚠️ Большой файл bot.ts (1352 строк) — можно разделить на модули  
⚠️ Нет unit тестов  
⚠️ Нет интеграционных тестов  
⚠️ Кэширование результатов API  
⚠️ Оптимизация запросов к БД  

### Рекомендации

1. **Рефакторинг bot.ts**
   - Разделить на handlers, commands, callbacks
   - Создать отдельные модули для логики

2. **Добавить тесты**
   - Unit тесты для API клиентов
   - Интеграционные тесты для бота

3. **Оптимизация**
   - Кэширование результатов Modrinth/CurseForge
   - Использование Redis для кэша
   - Оптимизация запросов к БД

4. **Мониторинг**
   - Добавить Sentry для отслеживания ошибок
   - Метрики производительности
   - Алерты при проблемах

---

**Проект готов к использованию и масштабированию!** 🚀

