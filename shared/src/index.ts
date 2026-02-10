// Shared types for Twitch Node Game

export interface User {
  id: number;
  twitchId: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  createdAt: Date;
}

export interface GameSession {
  id: number;
  sessionCode: string;
  hostUserId: number;
  gameState: GameState;
  maxPlayers: number;
  currentPlayers: number;
  isActive: boolean;
  createdAt: Date;
}

export interface GameState {
  players: PlayerState[];
  gamePhase: 'waiting' | 'playing' | 'finished';
  round: number;
  scores: Record<string, number>;
  startedAt?: Date;
  endedAt?: Date;
}

export interface PlayerState {
  userId: number;
  position: { x: number; y: number };
  health: number;
  score: number;
  isReady: boolean;
}

export interface PlayerScore {
  id: number;
  userId: number;
  gameSessionId: number;
  score: number;
  joinedAt: Date;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  totalScore: number;
  gamesPlayed: number;
  wins: number;
  rank: number;
}

// WebSocket message types
export type WebSocketMessage =
  | { type: 'connect'; payload: { userId: number; token: string } }
  | { type: 'disconnect'; payload: { userId: number } }
  | { type: 'create_game'; payload: { maxPlayers: number } }
  | { type: 'join_game'; payload: { sessionCode: string } }
  | { type: 'leave_game'; payload: { sessionCode: string } }
  | { type: 'game_action'; payload: { sessionCode: string; action: GameAction } }
  | { type: 'chat_message'; payload: { sessionCode: string; message: string } }
  | { type: 'ready_state'; payload: { sessionCode: string; isReady: boolean } };

export type GameAction =
  | { type: 'move'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'attack'; targetId: number }
  | { type: 'use_item'; itemId: string }
  | { type: 'special_ability'; abilityId: string };

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface GameSessionResponse {
  session: GameSession;
  players: User[];
  host: User;
}

// Environment variables
export interface EnvConfig {
  twitchClientId: string;
  twitchClientSecret: string;
  twitchRedirectUri: string;
  jwtSecret: string;
  databaseUrl: string;
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
}