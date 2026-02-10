Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Twitch Node Game - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check for pnpm
Write-Host "Step 1: Checking for pnpm..." -ForegroundColor Yellow
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    Write-Host "pnpm is already installed." -ForegroundColor Green
} else {
    Write-Host "pnpm not found. Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install pnpm." -ForegroundColor Red
        exit 1
    }
}

# Step 2: Install dependencies
Write-Host ""
Write-Host "Step 2: Installing dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies." -ForegroundColor Red
    exit 1
}

# Step 3: Setup environment
Write-Host ""
Write-Host "Step 3: Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path "api\.env")) {
    Write-Host "Creating api/.env from template..." -ForegroundColor Yellow
    Copy-Item "api\.env.example" "api\.env"
    Write-Host ""
    Write-Host "IMPORTANT: Please edit api/.env and add your:" -ForegroundColor Magenta
    Write-Host "  - TWITCH_CLIENT_ID" -ForegroundColor Magenta
    Write-Host "  - TWITCH_CLIENT_SECRET" -ForegroundColor Magenta
    Write-Host "  - JWT_SECRET (generate a random string)" -ForegroundColor Magenta
    Write-Host ""
    Read-Host "Press Enter to continue..."
} else {
    Write-Host "api/.env already exists." -ForegroundColor Green
}

# Step 4: Setup database
Write-Host ""
Write-Host "Step 4: Setting up database..." -ForegroundColor Yellow
Set-Location api
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to generate Prisma client." -ForegroundColor Red
    Set-Location ..
    exit 1
}

npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to run database migrations." -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Step 5: Completion
Write-Host ""
Write-Host "Step 5: Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the development servers:" -ForegroundColor Cyan
Write-Host "  1. Open two terminal windows" -ForegroundColor Cyan
Write-Host "  2. In first terminal: pnpm --filter api dev" -ForegroundColor Cyan
Write-Host "  3. In second terminal: pnpm --filter frontend dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or use: pnpm dev (to start both)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API: http://localhost:3000" -ForegroundColor Green
Write-Host "WebSocket: ws://localhost:3000/ws" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit..."