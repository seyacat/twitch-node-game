# Twitch Node Game

A full-stack multiplayer game platform with Twitch authentication, real-time WebSocket communication, and comprehensive dashboard.

## Features

- **Twitch OAuth 2.0 Authentication**: Secure login using Twitch accounts
- **Real-time WebSocket Communication**: Multiplayer game state synchronization
- **SQLite Database**: Persistent storage for user profiles, game sessions, and leaderboards
- **Vue 3 Frontend**: Modern, responsive user interface with TypeScript
- **Fastify Backend**: High-performance API server with WebSocket support
- **Monorepo Structure**: Organized codebase with shared TypeScript types

## Project Structure

```
twitch-node-game/
├── api/                    # Fastify TypeScript API
│   ├── src/
│   │   ├── server.ts      # Fastify server setup
│   │   ├── websocket/     # WebSocket handlers
│   │   ├── auth/          # Twitch OAuth & JWT
│   │   ├── database/      # SQLite models & migrations
│   │   ├── game/          # Game logic & state management
│   │   └── types/         # Shared TypeScript types
│   ├── prisma/            # Database schema
│   ├── package.json
│   └── tsconfig.json
├── frontend/              # Vue 3 + Vite + TypeScript
│   ├── src/
│   │   ├── views/         # Vue page components
│   │   ├── components/    # Reusable UI components
│   │   ├── composables/   # Vue composables
│   │   ├── stores/        # Pinia stores
│   │   └── types/         # Shared types
│   ├── package.json
│   └── vite.config.ts
├── shared/                # Shared code between API and frontend
│   └── src/               # Common TypeScript interfaces
├── plans/                 # Project documentation and planning
└── package.json           # Monorepo root configuration
```

## Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher (recommended) or npm/yarn
- Twitch Developer Account (for OAuth credentials)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd twitch-node-game

# Install dependencies using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 2. Configure Twitch OAuth

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create a new application
3. Set the OAuth Redirect URL to: `http://localhost:3000/auth/twitch/callback`
4. Copy the Client ID and Client Secret

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp api/.env.example api/.env

# Edit the .env file with your credentials
# You'll need to set:
# - TWITCH_CLIENT_ID
# - TWITCH_CLIENT_SECRET
# - JWT_SECRET (generate a strong random string)
```

### 4. Set Up Database

```bash
# Navigate to the API directory
cd api

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Or if using pnpm from root
pnpm --filter api migrate
```

### 5. Start Development Servers

```bash
# From the project root, start both servers
pnpm dev

# Or start them separately:
# Terminal 1: Start backend
pnpm --filter api dev

# Terminal 2: Start frontend
pnpm --filter frontend dev
```

### 6. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health
- WebSocket: ws://localhost:3000/ws

## API Endpoints

### Authentication
- `GET /auth/twitch` - Initiate Twitch OAuth flow
- `GET /auth/twitch/callback` - OAuth callback handler
- `POST /auth/refresh` - Refresh JWT token

### Game Management
- `POST /api/game/create` - Create new game session
- `GET /api/game/active` - Get active game sessions
- `POST /api/game/:id/join` - Join game session

### User Management
- `GET /api/user/profile` - Get user profile
- `GET /api/user/stats` - Get user game statistics

### Leaderboard
- `GET /api/leaderboard` - Get global leaderboard

### WebSocket
- `WS /ws` - WebSocket connection endpoint

## WebSocket Events

### Client to Server
- `create_game` - Create a new game session
- `join_game` - Join an existing game session
- `leave_game` - Leave current game session
- `game_action` - Send game action (move, attack, etc.)
- `chat_message` - Send chat message
- `ready_state` - Update player ready status

### Server to Client
- `connected` - Connection established
- `game_created` - Game session created
- `player_joined` - New player joined game
- `player_left` - Player left game
- `game_state_update` - Game state updated
- `chat_message` - New chat message
- `game_started` - Game started
- `error` - Error message

## Development

### Code Quality
```bash
# Run linting
pnpm lint

# Type checking
pnpm --filter frontend type-check
pnpm --filter api build
```

### Database Management
```bash
# Generate Prisma client
pnpm --filter api prisma generate

# Create migration
pnpm --filter api prisma migrate dev --name <migration-name>

# Reset database (development only)
pnpm --filter api prisma migrate reset
```

### Testing
```bash
# Run tests
pnpm test
```

## Deployment

### Production Build
```bash
# Build both projects
pnpm build

# Start production server
pnpm --filter api start
```

### Environment Variables for Production
Ensure the following environment variables are set in production:

```env
NODE_ENV=production
DATABASE_URL=sqlite:/path/to/production.db
JWT_SECRET=<strong-random-secret>
TWITCH_CLIENT_ID=<your-client-id>
TWITCH_CLIENT_SECRET=<your-client-secret>
TWITCH_REDIRECT_URI=https://your-domain.com/auth/twitch/callback
FRONTEND_URL=https://your-domain.com
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request