# Quick Setup Guide

## 1. Install Dependencies

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm

# Install project dependencies
pnpm install
```

## 2. Configure Twitch OAuth

1. Visit [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click "Register Your Application"
3. Fill in:
   - Name: "Twitch Node Game (Development)"
   - OAuth Redirect URLs: `http://localhost:3000/auth/twitch/callback`
   - Category: "Game"
4. Click "Create"
5. Copy the Client ID and generate a Client Secret

## 3. Set Up Environment

```bash
# Copy environment example
cp api/.env.example api/.env

# Edit the file with your credentials
# On Windows, you can use:
notepad api/.env
```

Edit `api/.env` with:

```env
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
TWITCH_REDIRECT_URI=http://localhost:3000/auth/twitch/callback
JWT_SECRET=generate_a_strong_random_string_here
DATABASE_URL=sqlite:./database.sqlite
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## 4. Initialize Database

```bash
# Generate Prisma client
cd api
npx prisma generate

# Create database and run migrations
npx prisma migrate dev --name init

# Or from root with pnpm
pnpm --filter api prisma generate
pnpm --filter api migrate
```

## 5. Start Development Servers

```bash
# Start both servers (recommended)
pnpm dev

# Or start separately:
# Terminal 1 - Backend
pnpm --filter api dev

# Terminal 2 - Frontend
pnpm --filter frontend dev
```

## 6. Test the Application

1. Open browser to: http://localhost:5173
2. Click "Login with Twitch"
3. Authorize the application
4. You'll be redirected to the dashboard
5. Create a game or join an existing one

## Troubleshooting

### Database Issues
```bash
# Reset database (development only)
cd api
npx prisma migrate reset
```

### Port Already in Use
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Or for port 5173
netstat -ano | findstr :5173
```

### Missing Dependencies
```bash
# Clean install
rm -rf node_modules api/node_modules frontend/node_modules shared/node_modules
pnpm install
```

### TypeScript Errors
```bash
# Build to check for errors
pnpm --filter api build
pnpm --filter frontend build
```

## Next Steps

1. Explore the dashboard interface
2. Create a game session
3. Test WebSocket connectivity
4. Check the browser console for WebSocket messages
5. Review the API documentation in README.md