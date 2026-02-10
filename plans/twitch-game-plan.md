# Twitch Node Game - Development Plan

## Project Overview
A full-stack multiplayer game platform with Twitch authentication, real-time WebSocket communication, and comprehensive dashboard.

## Architecture
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
│   ├── package.json
│   └── tsconfig.json
├── frontend/              # Vue 3 + Vite + TypeScript
│   ├── src/
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   └── Dashboard.vue
│   │   ├── components/
│   │   ├── composables/   # Vue composables
│   │   ├── stores/        # Pinia stores
│   │   └── types/         # Shared types
│   ├── package.json
│   └── vite.config.ts
├── shared/                # Shared code between API and frontend
│   └── types/             # Common TypeScript interfaces
├── package.json           # Monorepo root
└── docker-compose.yml     # Optional container setup
```

## Technology Stack
- **Backend**: Fastify, TypeScript, SQLite, JSON Web Tokens (JWT)
- **Frontend**: Vue 3, Vite, TypeScript, Pinia, Vue Router
- **Authentication**: Twitch OAuth 2.0
- **Real-time**: WebSockets (via Fastify WebSocket plugin)
- **Database**: SQLite with TypeORM/Prisma
- **Build Tools**: pnpm workspaces (monorepo)

## Todo List

### Phase 1: Project Setup & Infrastructure
- [ ] Initialize monorepo with pnpm workspaces
- [ ] Create root package.json with workspaces configuration
- [ ] Set up shared TypeScript configuration
- [ ] Configure ESLint and Prettier for code consistency
- [ ] Create Docker setup for development environment

### Phase 2: Backend API Development
- [ ] Initialize Fastify TypeScript project in `api/`
- [ ] Set up SQLite database with TypeORM/Prisma
- [ ] Create database schema:
  - Users (Twitch ID, username, profile data)
  - Game sessions (state, players, scores)
  - Leaderboards (historical rankings)
  - WebSocket connections mapping
- [ ] Implement Twitch OAuth 2.0 authentication flow:
  - `/auth/twitch` - Initiate OAuth flow
  - `/auth/twitch/callback` - Handle callback
  - JWT token generation and validation
- [ ] Set up WebSocket server with Fastify:
  - Connection management
  - Room/Channel system for game sessions
  - Real-time game state synchronization
- [ ] Create REST endpoints:
  - User profile management
  - Game session creation/joining
  - Leaderboard queries
- [ ] Implement game logic:
  - Multiplayer game state management
  - Player movement/actions
  - Score calculation
  - Game session lifecycle

### Phase 3: Frontend Development
- [ ] Initialize Vue 3 + Vite + TypeScript project in `frontend/`
- [ ] Set up Vue Router with authentication guards
- [ ] Configure Pinia for state management
- [ ] Create shared TypeScript types in `shared/` directory
- [ ] Implement Login view:
  - Twitch OAuth button
  - JWT token handling
  - Redirect to dashboard on success
- [ ] Create Dashboard view:
  - User profile display
  - Active game sessions
  - Leaderboard visualization
  - Game creation/joining interface
- [ ] Implement WebSocket client:
  - Connection to backend WebSocket server
  - Real-time game updates
  - Chat functionality
- [ ] Create game interface components:
  - Game canvas/board
  - Player list
  - Score display
  - Chat window

### Phase 4: Integration & Real-time Features
- [ ] Connect frontend to backend API
- [ ] Implement WebSocket reconnection logic
- [ ] Create real-time game state synchronization
- [ ] Add chat functionality with Twitch emotes support
- [ ] Implement leaderboard updates in real-time
- [ ] Add game session persistence

### Phase 5: Testing & Deployment
- [ ] Write unit tests for backend API
- [ ] Write component tests for frontend
- [ ] Test WebSocket functionality
- [ ] Set up CI/CD pipeline
- [ ] Configure production deployment
- [ ] Performance optimization

## Database Schema
```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twitch_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_image_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Game sessions table
CREATE TABLE game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_code TEXT UNIQUE NOT NULL,
  host_user_id INTEGER REFERENCES users(id),
  game_state JSON NOT NULL,
  max_players INTEGER DEFAULT 4,
  current_players INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player scores table
CREATE TABLE player_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  game_session_id INTEGER REFERENCES game_sessions(id),
  score INTEGER DEFAULT 0,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard table
CREATE TABLE leaderboards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  total_score INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints
- `GET /auth/twitch` - Redirect to Twitch OAuth
- `GET /auth/twitch/callback` - OAuth callback handler
- `POST /auth/refresh` - Refresh JWT token
- `GET /api/user/profile` - Get user profile
- `POST /api/game/create` - Create new game session
- `GET /api/game/:id` - Get game session details
- `POST /api/game/:id/join` - Join game session
- `GET /api/leaderboard` - Get leaderboard data
- `WS /ws` - WebSocket connection endpoint

## WebSocket Events
- `connect` - Client connects
- `disconnect` - Client disconnects
- `join_game` - Join a game session
- `leave_game` - Leave a game session
- `game_action` - Player action in game
- `chat_message` - Send chat message
- `game_state_update` - Broadcast game state changes

## Security Considerations
- JWT token expiration and refresh mechanism
- WebSocket connection authentication
- SQL injection prevention
- XSS protection for frontend
- CORS configuration for API
- Rate limiting for authentication endpoints

## Development Workflow
1. Clone repository and install dependencies with `pnpm install`
2. Set up Twitch Developer application for OAuth credentials
3. Configure environment variables (.env files)
4. Run database migrations
5. Start development servers:
   - Backend: `pnpm --filter api dev`
   - Frontend: `pnpm --filter frontend dev`
6. Access application at `http://localhost:5173`

## Next Steps
1. Review and approve this plan
2. Set up Twitch Developer application
3. Begin implementation in Code mode