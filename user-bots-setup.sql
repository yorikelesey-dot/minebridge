-- Таблица для пользовательских ботов
CREATE TABLE user_bots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE, -- Один бот на пользователя
  bot_token TEXT NOT NULL UNIQUE,
  bot_username TEXT,
  bot_name TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ
);

-- Индекс для быстрого поиска
CREATE INDEX idx_user_bots_user_id ON user_bots(user_id);
CREATE INDEX idx_user_bots_active ON user_bots(is_active);

-- Статистика пользовательских ботов
CREATE TABLE user_bot_stats (
  id BIGSERIAL PRIMARY KEY,
  bot_id BIGINT REFERENCES user_bots(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  request_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_bot_stats_bot_id ON user_bot_stats(bot_id);
