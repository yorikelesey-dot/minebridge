@echo off
chcp 65001 >nul
echo.
echo ========================================
echo 🚀 MineBridge - Полный деплой
echo ========================================
echo.

REM Проверка изменений
echo 📋 Проверяю изменения...
git status --short
echo.

REM Компиляция
echo 🔨 Компилирую TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ Ошибка компиляции!
    pause
    exit /b 1
)
echo ✅ Компиляция успешна
echo.

REM Git add
echo 📦 Добавляю файлы в git...
git add .
echo.

REM Запрос сообщения коммита
set /p commit_msg="💬 Введи сообщение коммита: "
if "%commit_msg%"=="" set commit_msg=Update

REM Коммит
echo 📝 Создаю коммит...
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Нет изменений для коммита или ошибка
    echo.
    choice /C YN /M "Продолжить деплой без коммита?"
    if errorlevel 2 exit /b 0
)
echo.

REM Push
echo 🚀 Отправляю на GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo ❌ Ошибка push!
    pause
    exit /b 1
)
echo ✅ Код отправлен на GitHub
echo.

REM Ожидание деплоя
echo ⏳ Жду деплой на Vercel (30 секунд)...
timeout /t 30 /nobreak >nul
echo.

REM Сброс бота
echo 🔄 Сбрасываю бота...
node reset-bot.js
echo.

echo ========================================
echo ✅ Деплой завершён!
echo ========================================
echo.
echo 📝 Что дальше:
echo 1. Отправь боту /start
echo 2. Проверь новые функции
echo 3. Проверь логи: https://vercel.com/dashboard
echo.
pause
