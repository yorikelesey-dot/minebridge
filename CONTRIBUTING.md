# 🤝 Руководство по разработке

## Структура проекта

```
minecraft-mods-bot/
├── api/
│   └── webhook.ts              # Vercel serverless endpoint
├── src/
│   ├── api/
│   │   ├── modrinth.ts         # Modrinth API клиент
│   │   └── curseforge.ts       # CurseForge API клиент
│   ├── utils/
│   │   ├── download.ts         # Утилиты скачивания
│   │   └── helpers.ts          # Вспомогательные функции
│   ├── bot.ts                  # Основная логика бота
│   ├── config.ts               # Конфигурация
│   ├── database.ts             # Supabase интеграция
│   ├── keyboards.ts            # Inline клавиатуры
│   └── index.ts                # Dev entry point
├── .env.example                # Пример переменных окружения
├── package.json
├── tsconfig.json
├── vercel.json                 # Конфигурация Vercel
└── README.md
```

## 🛠️ Локальная разработка

### Требования

- Node.js 18+
- npm или yarn
- Telegram Bot Token
- Supabase проект

### Установка

```bash
# Клонирование
git clone <your-repo>
cd minecraft-mods-bot

# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Заполни .env своими ключами

# Запуск в dev режиме
npm run dev
```

### Тестирование изменений

1. Внеси изменения в код
2. Бот автоматически перезапустится (hot reload)
3. Протестируй в Telegram
4. Проверь логи в консоли

## 📝 Добавление новых функций

### Добавление новой команды

1. Открой `src/bot.ts`
2. Добавь обработчик:

```typescript
bot.command('mycommand', async (ctx) => {
  await ctx.reply('Ответ на команду');
});
```

### Добавление новой кнопки

1. Открой `src/keyboards.ts`
2. Добавь кнопку в клавиатуру:

```typescript
Markup.button.callback('🆕 Новая', 'new_action')
```

3. Открой `src/bot.ts`
4. Добавь обработчик:

```typescript
bot.action('new_action', async (ctx) => {
  await ctx.answerCbQuery('Обработка...');
  // Твоя логика
});
```

### Добавление нового API источника

1. Создай файл `src/api/newsource.ts`:

```typescript
import axios from 'axios';

const API_URL = 'https://api.example.com';

export async function searchNewSource(query: string) {
  const response = await axios.get(`${API_URL}/search`, {
    params: { q: query }
  });
  return response.data;
}
```

2. Импортируй в `src/bot.ts`:

```typescript
import { searchNewSource } from './api/newsource';
```

3. Используй в обработчиках

### Добавление новой таблицы в Supabase

1. Открой Supabase SQL Editor
2. Создай таблицу:

```sql
CREATE TABLE my_new_table (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  data TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_my_table_user 
ON my_new_table(user_id, timestamp DESC);
```

3. Добавь функции в `src/database.ts`:

```typescript
export async function saveToNewTable(userId: number, data: string) {
  const { error } = await supabase
    .from('my_new_table')
    .insert({ user_id: userId, data });
  
  if (error) console.error('Error:', error);
}
```

## 🧪 Тестирование

### Ручное тестирование

1. Запусти бота: `npm run dev`
2. Открой Telegram
3. Протестируй все функции:
   - [ ] /start команда
   - [ ] Поиск модов
   - [ ] Поиск шейдеров
   - [ ] Поиск ресурспаков
   - [ ] Скачивание файлов
   - [ ] Rate limiting

### Проверка типов

```bash
npm run build
```

### Проверка логов

```bash
# Локально - смотри консоль

# На Vercel
vercel logs
```

## 🚀 Деплой

### Перед деплоем

1. Проверь, что всё работает локально
2. Закоммить изменения:

```bash
git add .
git commit -m "Описание изменений"
git push
```

### Деплой на Vercel

```bash
# Preview деплой
vercel

# Production деплой
vercel --prod
```

### После деплоя

1. Проверь логи: `vercel logs`
2. Протестируй бота в Telegram
3. Проверь метрики в Supabase

## 📊 Мониторинг

### Проверка здоровья бота

```sql
-- В Supabase SQL Editor
SELECT 
  MAX(timestamp) as last_activity,
  COUNT(*) as requests_last_hour
FROM user_requests
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

### Проверка ошибок

```bash
# Vercel логи
vercel logs --follow

# Фильтр по ошибкам
vercel logs | grep -i error
```

## 🐛 Отладка

### Частые проблемы

**Бот не отвечает**
- Проверь токен в .env
- Проверь вебхук: открой `/api/webhook` в браузере
- Проверь логи: `vercel logs`

**Ошибки Supabase**
- Проверь URL и ключ
- Проверь, что таблицы созданы
- Проверь RLS политики

**Rate limit не работает**
- Проверь таблицу `user_requests`
- Проверь индексы
- Проверь логику в `src/database.ts`

### Включение debug логов

В `src/bot.ts` добавь:

```typescript
bot.use((ctx, next) => {
  console.log('Update:', JSON.stringify(ctx.update, null, 2));
  return next();
});
```

## 📚 Полезные ресурсы

- [Telegraf документация](https://telegraf.js.org)
- [Modrinth API](https://docs.modrinth.com)
- [CurseForge API](https://docs.curseforge.com)
- [Supabase документация](https://supabase.com/docs)
- [Vercel документация](https://vercel.com/docs)

## 🤝 Внесение изменений

1. Форкни репозиторий
2. Создай ветку: `git checkout -b feature/amazing-feature`
3. Закоммить: `git commit -m 'Add amazing feature'`
4. Запуш: `git push origin feature/amazing-feature`
5. Открой Pull Request

## 📝 Стиль кода

- Используй TypeScript
- Форматирование: 2 пробела
- Async/await вместо промисов
- Обрабатывай все ошибки
- Добавляй комментарии к сложной логике

## ✅ Чеклист перед PR

- [ ] Код работает локально
- [ ] Нет TypeScript ошибок
- [ ] Добавлены комментарии
- [ ] Обновлена документация
- [ ] Протестированы все изменения
- [ ] Проверены логи на ошибки

---

Спасибо за вклад в проект! 🎉
