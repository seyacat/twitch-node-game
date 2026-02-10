# System Architecture Diagram

## Authentication Flow
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant TwitchAPI

    User->>Frontend: Click Login with Twitch
    Frontend->>Backend: GET /auth/twitch
    Backend->>Frontend: Redirect to Twitch OAuth
    Frontend->>TwitchAPI: User authenticates with Twitch
    TwitchAPI->>Frontend: Redirect with auth code
    Frontend->>Backend: GET /auth/twitch/callback?code=
    Backend->>TwitchAPI: Exchange code for tokens
    TwitchAPI->>Backend: Return access/refresh tokens
    Backend->>Backend: Create/update user in DB
    Backend->>Backend: Generate JWT token
    Backend->>Frontend: Return JWT token
    Frontend->>Frontend: Store JWT in localStorage
    Frontend->>User: Redirect to Dashboard
```

## WebSocket Game Flow
```mermaid
sequenceDiagram
    participant Player1
    participant Player2
    participant Frontend1
    participant Frontend2
    participant BackendWS
    participant GameState

    Player1->>Frontend1: Create game session
    Frontend1->>BackendWS: WebSocket: create_game
    BackendWS->>GameState: Initialize game state
    BackendWS->>BackendWS: Generate session code
    BackendWS->>Frontend1: Return session code
    
    Player2->>Frontend2: Join with session code
    Frontend2->>BackendWS: WebSocket: join_game
    BackendWS->>GameState: Add player to game
    BackendWS->>Frontend1: Broadcast: player_joined
    BackendWS->>Frontend2: Send: game_state
    
    Player1->>Frontend1: Perform game action
    Frontend1->>BackendWS: WebSocket: game_action
    BackendWS->>GameState: Update game state
    BackendWS->>Frontend1: Broadcast: game_state_update
    BackendWS->>Frontend2: Broadcast: game_state_update
```

## System Architecture
```mermaid
graph TB
    subgraph "Frontend Vue 3 App"
        A[Login View]
        B[Dashboard View]
        C[Game Interface]
        D[WebSocket Client]
        E[Pinia Store]
        F[Vue Router]
    end
    
    subgraph "Backend Fastify API"
        G[HTTP Server]
        H[WebSocket Server]
        I[Auth Middleware]
        J[Game Logic]
        K[Database Layer]
    end
    
    subgraph "External Services"
        L[Twitch OAuth]
        M[SQLite Database]
    end
    
    A -->|OAuth Flow| L
    B -->|API Calls| G
    D -->|WebSocket| H
    G -->|JWT Validation| I
    H -->|Game Events| J
    J -->|Persist State| K
    K -->|SQL| M
    I -->|Validate Token| G
```

## Database Relationships
```mermaid
erDiagram
    USERS ||--o{ GAME_SESSIONS : hosts
    USERS ||--o{ PLAYER_SCORES : achieves
    GAME_SESSIONS ||--o{ PLAYER_SCORES : contains
    USERS ||--|| LEADERBOARDS : has
    
    USERS {
        integer id PK
        string twitch_id UK
        string username
        string display_name
        string profile_image_url
        datetime created_at
    }
    
    GAME_SESSIONS {
        integer id PK
        string session_code UK
        integer host_user_id FK
        json game_state
        boolean is_active
        datetime created_at
    }
    
    PLAYER_SCORES {
        integer id PK
        integer user_id FK
        integer game_session_id FK
        integer score
        datetime joined_at
    }
    
    LEADERBOARDS {
        integer id PK
        integer user_id FK
        integer total_score
        integer games_played
        integer wins
        datetime updated_at
    }
```

## Component Structure
```mermaid
graph LR
    subgraph "Frontend Components"
        Login[Login.vue]
        Dashboard[Dashboard.vue]
        GameLobby[GameLobby.vue]
        GameBoard[GameBoard.vue]
        Chat[ChatComponent.vue]
        Leaderboard[LeaderboardComponent.vue]
    end
    
    subgraph "Backend Modules"
        Auth[Auth Module]
        WebSocket[WebSocket Module]
        Game[Game Module]
        Database[Database Module]
    end
    
    Login --> Auth
    Dashboard --> Game
    GameBoard --> WebSocket
    Chat --> WebSocket
    Leaderboard --> Database