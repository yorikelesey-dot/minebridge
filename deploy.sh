#!/bin/bash

# ============================================
# Автоматический деплой бота на Vercel
# ============================================
# Использование: bash deploy.sh
# ============================================

set -e  # Остановка при ошибке

echo "🚀 Minecraft Mods Bot - Автоматический деплой"
echo "=============================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода ошибок
error() {
    echo -e "${RED}❌ Ошибка: $1${NC}"
    exit 1
}

# Функция для вывода успеха
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для вывода предупреждений
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Шаг 1: Проверка Node.js
echo "📦 Проверка Node.js..."
if ! command -v node &> /dev/null; then
    error "Node.js не установлен. Установи с https://nodejs.org"
fi
NODE_VERSION=$(node -v)
success "Node.js $NODE_VERSION найден"
echo ""

# Шаг 2: Проверка npm
echo "📦 Проверка npm..."
if ! command -v npm &> /dev/null; then
    error "npm не установлен"
fi
NPM_VERSION=$(npm -v)
success "npm $NPM_VERSION найден"
echo ""

# Шаг 3: Проверка Vercel CLI
echo "🔧 Проверка Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    warning "Vercel CLI не установлен"
    echo "Устанавливаю Vercel CLI..."
    npm install -g vercel || error "Не удалось установить Vercel CLI"
    success "Vercel CLI установлен"
fi
success "Vercel CLI найден"
echo ""

# Шаг 4: Проверка .env файла
echo "🔑 Проверка переменных окружения..."
if [ ! -f .env ]; then
    error ".env файл не найден. Создай его: cp .env.example .env"
fi
success ".env файл найден"
echo ""

# Шаг 5: Проверка обязательных переменных
echo "🔍 Проверка обязательных переменных..."
source .env

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    error "TELEGRAM_BOT_TOKEN не задан в .env"
fi
success "TELEGRAM_BOT_TOKEN задан"

if [ -z "$SUPABASE_URL" ]; then
    error "SUPABASE_URL не задан в .env"
fi
success "SUPABASE_URL задан"

if [ -z "$SUPABASE_KEY" ]; then
    error "SUPABASE_KEY не задан в .env"
fi
success "SUPABASE_KEY задан"

if [ -z "$WEBHOOK_DOMAIN" ]; then
    warning "WEBHOOK_DOMAIN не задан. Установи его после деплоя!"
fi
echo ""

# Шаг 6: Установка зависимостей
echo "📦 Установка зависимостей..."
if [ ! -d "node_modules" ]; then
    npm install || error "Не удалось установить зависимости"
    success "Зависимости установлены"
else
    success "Зависимости уже установлены"
fi
echo ""

# Шаг 7: Проверка TypeScript
echo "🔍 Проверка TypeScript..."
npm run type-check || error "Ошибки TypeScript. Исправь их перед деплоем."
success "TypeScript проверка пройдена"
echo ""

# Шаг 8: Сборка проекта
echo "🔨 Сборка проекта..."
npm run build || error "Не удалось собрать проект"
success "Проект собран"
echo ""

# Шаг 9: Логин в Vercel (если нужно)
echo "🔐 Проверка авторизации Vercel..."
if ! vercel whoami &> /dev/null; then
    warning "Не авторизован в Vercel"
    echo "Выполни авторизацию..."
    vercel login || error "Не удалось авторизоваться"
    success "Авторизация выполнена"
else
    VERCEL_USER=$(vercel whoami)
    success "Авторизован как: $VERCEL_USER"
fi
echo ""

# Шаг 10: Деплой на Vercel
echo "🚀 Деплой на Vercel..."
echo "Выбери режим деплоя:"
echo "1) Production (рекомендуется)"
echo "2) Preview"
read -p "Выбор (1 или 2): " DEPLOY_MODE

if [ "$DEPLOY_MODE" = "1" ]; then
    echo "Деплою в Production..."
    DEPLOY_OUTPUT=$(vercel --prod --yes 2>&1)
    DEPLOY_STATUS=$?
else
    echo "Деплою в Preview..."
    DEPLOY_OUTPUT=$(vercel --yes 2>&1)
    DEPLOY_STATUS=$?
fi

if [ $DEPLOY_STATUS -ne 0 ]; then
    error "Деплой не удался:\n$DEPLOY_OUTPUT"
fi

# Извлечение URL из вывода
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+' | tail -1)

if [ -z "$DEPLOY_URL" ]; then
    error "Не удалось получить URL деплоя"
fi

success "Деплой выполнен!"
echo ""
echo "🌐 URL: $DEPLOY_URL"
echo ""

# Шаг 11: Настройка переменных окружения (если первый деплой)
echo "🔧 Настройка переменных окружения..."
read -p "Это первый деплой? Нужно настроить переменные? (y/n): " SETUP_ENV

if [ "$SETUP_ENV" = "y" ] || [ "$SETUP_ENV" = "Y" ]; then
    echo "Добавляю переменные окружения..."
    
    echo "$TELEGRAM_BOT_TOKEN" | vercel env add TELEGRAM_BOT_TOKEN production
    echo "$SUPABASE_URL" | vercel env add SUPABASE_URL production
    echo "$SUPABASE_KEY" | vercel env add SUPABASE_KEY production
    
    if [ ! -z "$CURSEFORGE_API_KEY" ]; then
        echo "$CURSEFORGE_API_KEY" | vercel env add CURSEFORGE_API_KEY production
    fi
    
    # Извлечение домена из URL
    DOMAIN=$(echo "$DEPLOY_URL" | sed 's|https://||' | sed 's|/.*||')
    echo "$DOMAIN" | vercel env add WEBHOOK_DOMAIN production
    
    success "Переменные окружения добавлены"
    
    # Повторный деплой с переменными
    echo "Повторный деплой с переменными..."
    vercel --prod --yes || error "Повторный деплой не удался"
    success "Повторный деплой выполнен"
fi
echo ""

# Шаг 12: Установка вебхука
echo "🔗 Установка вебхука..."
WEBHOOK_URL="$DEPLOY_URL/api/webhook"
echo "Открываю: $WEBHOOK_URL"

WEBHOOK_RESPONSE=$(curl -s "$WEBHOOK_URL")
if echo "$WEBHOOK_RESPONSE" | grep -q "ok"; then
    success "Вебхук установлен успешно!"
else
    warning "Не удалось автоматически установить вебхук"
    echo "Открой вручную: $WEBHOOK_URL"
fi
echo ""

# Шаг 13: Финальная проверка
echo "✅ Финальная проверка..."
echo ""
echo "=============================================="
echo "🎉 Деплой завершён успешно!"
echo "=============================================="
echo ""
echo "📋 Информация о деплое:"
echo "   URL: $DEPLOY_URL"
echo "   Webhook: $WEBHOOK_URL"
echo ""
echo "📱 Следующие шаги:"
echo "   1. Открой Telegram и найди своего бота"
echo "   2. Отправь команду /start"
echo "   3. Проверь работу бота"
echo ""
echo "📊 Мониторинг:"
echo "   Логи: vercel logs --follow"
echo "   Dashboard: https://vercel.com"
echo ""
echo "🆘 Если что-то не работает:"
echo "   1. Проверь логи: vercel logs"
echo "   2. Проверь переменные: vercel env ls"
echo "   3. Открой вебхук в браузере: $WEBHOOK_URL"
echo ""
echo "=============================================="
echo "Готово! 🚀"
echo "=============================================="
