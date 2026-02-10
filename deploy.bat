@echo off
chcp 65001 >nul

:menu
cls
echo ========================================
echo 🤖 УПРАВЛЕНИЕ БОТОМ MINEBRIDGE
echo ========================================
echo.
echo Выбери действие:
echo.
echo 1. 🚀 Полный деплой (build + git + webhook)
echo 2. 🔨 Только компиляция (npm run build)
echo 3. 🔄 Сбросить webhook
echo 4. 🔍 Проверить webhook
echo 5. 📊 Проверить права бота в канале
echo 6. 📬 Получить последние обновления
echo 7. 📤 Git push (без build)
echo 8. ❌ Выход
echo.
set /p choice="Введи номер: "

if "%choice%"=="1" goto deploy
if "%choice%"=="2" goto build
if "%choice%"=="3" goto reset_webhook
if "%choice%"=="4" goto check_webhook
if "%choice%"=="5" goto check_permissions
if "%choice%"=="6" goto get_updates
if "%choice%"=="7" goto git_push
if "%choice%"=="8" goto end
goto menu

:deploy
cls
echo ========================================
echo 🚀 ПОЛНЫЙ ДЕПЛОЙ БОТА
echo ========================================
echo.

echo 📋 Проверяю изменения...
git status --short
echo.

echo 🔨 Компилирую TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Ошибка компиляции!
    pause
    goto menu
)
echo ✅ Компиляция успешна
echo.

echo 📦 Добавляю файлы в git...
git add .
echo.

set /p commit_msg="💬 Введи сообщение коммита: "
if "%commit_msg%"=="" set commit_msg=Update

git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo ⚠️ Нет изменений для коммита
    choice /C YN /M "Продолжить деплой без коммита?"
    if errorlevel 2 goto menu
)
echo.

echo 🚀 Отправляю на GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ❌ Ошибка при пуше!
    pause
    goto menu
)
echo ✅ Код загружен на GitHub
echo.

echo ⏳ Жду деплой Vercel (30 секунд)...
timeout /t 30 /nobreak >nul
echo.

echo 🔄 Обновляю webhook...
node reset-bot.js
echo.

echo ========================================
echo ✅ ДЕПЛОЙ ЗАВЕРШЁН!
echo ========================================
echo.
pause
goto menu

:build
cls
echo ========================================
echo 🔨 КОМПИЛЯЦИЯ TYPESCRIPT
echo ========================================
echo.
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Ошибка компиляции!
) else (
    echo ✅ Компиляция успешна
)
echo.
pause
goto menu

:reset_webhook
cls
echo ========================================
echo 🔄 СБРОС WEBHOOK
echo ========================================
echo.
node reset-bot.js
echo.
pause
goto menu

:check_webhook
cls
echo ========================================
echo 🔍 ПРОВЕРКА WEBHOOK
echo ========================================
echo.
node check-webhook.js
echo.
pause
goto menu

:check_permissions
cls
echo ========================================
echo 📊 ПРОВЕРКА ПРАВ БОТА
echo ========================================
echo.
node check-bot-permissions.js
echo.
pause
goto menu

:get_updates
cls
echo ========================================
echo 📬 ПОЛУЧЕНИЕ ОБНОВЛЕНИЙ
echo ========================================
echo.
node get-updates.js
echo.
pause
goto menu

:git_push
cls
echo ========================================
echo 📤 GIT PUSH (БЕЗ BUILD)
echo ========================================
echo.

echo 📋 Проверяю изменения...
git status --short
echo.

echo 📦 Добавляю файлы в git...
git add .
echo.

set /p commit_msg="💬 Введи сообщение коммита: "
if "%commit_msg%"=="" set commit_msg=Update

git commit -m "%commit_msg%"
echo.

echo 🚀 Отправляю на GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ❌ Ошибка при пуше!
) else (
    echo ✅ Код загружен на GitHub
)
echo.
pause
goto menu

:end
exit
