@echo off
echo ========================================
echo Twitch Node Game - Setup Script
echo ========================================
echo.

echo Step 1: Checking for pnpm...
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo pnpm not found. Installing pnpm...
    npm install -g pnpm
) else (
    echo pnpm is already installed.
)

echo.
echo Step 2: Installing dependencies...
pnpm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies.
    exit /b 1
)

echo.
echo Step 3: Setting up environment...
if not exist "api\.env" (
    echo Creating api/.env from template...
    copy "api\.env.example" "api\.env"
    echo.
    echo IMPORTANT: Please edit api/.env and add your:
    echo   - TWITCH_CLIENT_ID
    echo   - TWITCH_CLIENT_SECRET
    echo   - JWT_SECRET (generate a random string)
    echo.
    pause
) else (
    echo api/.env already exists.
)

echo.
echo Step 4: Setting up database...
cd api
npx prisma generate
if %errorlevel% neq 0 (
    echo Failed to generate Prisma client.
    cd ..
    exit /b 1
)

npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo Failed to run database migrations.
    cd ..
    exit /b 1
)
cd ..

echo.
echo Step 5: Setup complete!
echo.
echo To start the development servers:
echo   1. Open two terminal windows
echo   2. In first terminal: pnpm --filter api dev
echo   3. In second terminal: pnpm --filter frontend dev
echo.
echo Or use: pnpm dev (to start both)
echo.
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:3000
echo.
pause