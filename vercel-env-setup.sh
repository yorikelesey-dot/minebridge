#!/bin/bash

# ============================================
# Скрипт для быстрой настройки переменных окружения в Vercel
# ============================================
# Использование: bash vercel-env-setup.sh
# ============================================

echo "🚀 Настройка переменных окружения для Vercel"
echo ""

# Проверка установки Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI не установлен"
    echo "Установи: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI найден"
echo ""

# Проверка .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден"
    echo "Создай его: cp .env.example .env"
    exit 1
fi

echo "✅ Файл .env найден"
echo ""

# Загрузка переменных из .env
source .env

# Функция для добавления переменной
add_env_var() {
    local var_name=$1
    local var_value=$2
    
    if [ -z "$var_value" ]; then
        echo "⚠️  Пропуск $var_name (не задана)"
        return
    fi
    
    echo "📝 Добавление $var_name..."
    echo "$var_value" | vercel env add "$var_name" production preview development
    
    if [ $? -eq 0 ]; then
        echo "✅ $var_name добавлена"
    else
        echo "❌ Ошибка при добавлении $var_name"
    fi
    echo ""
}

# Добавление всех переменных
echo "🔧 Начинаю добавление переменных..."
echo ""

add_env_var "TELEGRAM_BOT_TOKEN" "$TELEGRAM_BOT_TOKEN"
add_env_var "CURSEFORGE_API_KEY" "$CURSEFORGE_API_KEY"
add_env_var "SUPABASE_URL" "$SUPABASE_URL"
add_env_var "SUPABASE_KEY" "$SUPABASE_KEY"
add_env_var "WEBHOOK_DOMAIN" "$WEBHOOK_DOMAIN"

echo "✅ Настройка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Задеплой проект: vercel --prod"
echo "2. Открой в браузере: https://$WEBHOOK_DOMAIN/api/webhook"
echo ""
