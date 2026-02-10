import { WebSocket } from '@fastify/websocket';
import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../database/connection';
import { WebSocketMessage, GameAction, GameState } from '@shared';

interface ClientConnection {
  socket: WebSocket;
  userId: number;
  username: string;
  sessionCode?: string;
}

interface GameRoom {
  sessionCode: string;
  hostUserId: number;
  clients: Set<ClientConnection>;
  gameState: GameState;
}

const clients = new Map<WebSocket, ClientConnection>();
const gameRooms = new Map<string, GameRoom>();

export const setupWebSocket = (connection: WebSocket, req: FastifyRequest) => {
  console.log('New WebSocket connection attempt');
  
  // Authenticate connection
  const token = req.headers['sec-websocket-protocol'] || 
                new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');
  
  if (!token) {
    connection.close(1008, 'Authentication required');
    return;
  }
  
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT secret not configured');
    }
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    const client: ClientConnection = {
      socket: connection,
      userId: decoded.userId,
      username: decoded.username,
    };
    
    clients.set(connection, client);
    
    console.log(`User ${decoded.username} (${decoded.userId}) connected via WebSocket`);
    
    // Send welcome message
    connection.send(JSON.stringify({
      type: 'connected',
      payload: {
        userId: decoded.userId,
        username: decoded.username,
        message: 'Connected to game server',
      },
    }));
    
    // Handle messages
    connection.on('message', (message) => {
      handleMessage(client, message.toString());
    });
    
    // Handle disconnection
    connection.on('close', () => {
      handleDisconnection(client);
    });
    
    // Handle errors
    connection.on('error', (error) => {
      console.error('WebSocket error:', error);
      handleDisconnection(client);
    });
    
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    connection.close(1008, 'Invalid token');
  }
};

const handleMessage = async (client: ClientConnection, message: string) => {
  try {
    const parsedMessage: WebSocketMessage = JSON.parse(message);
    
    switch (parsedMessage.type) {
      case 'create_game':
        await handleCreateGame(client, parsedMessage.payload);
        break;
      
      case 'join_game':
        await handleJoinGame(client, parsedMessage.payload);
        break;
      
      case 'leave_game':
        await handleLeaveGame(client, parsedMessage.payload);
        break;
      
      case 'game_action':
        await handleGameAction(client, parsedMessage.payload);
        break;
      
      case 'chat_message':
        await handleChatMessage(client, parsedMessage.payload);
        break;
      
      case 'ready_state':
        await handleReadyState(client, parsedMessage.payload);
        break;
      
      default:
        console.warn(`Unknown message type: ${(parsedMessage as any).type}`);
        client.socket.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Unknown message type' },
        }));
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
    client.socket.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Invalid message format' },
    }));
  }
};

const handleCreateGame = async (client: ClientConnection, payload: any) => {
  const { maxPlayers = 4 } = payload;
  
  // Generate unique session code
  const sessionCode = generateSessionCode();
  
  // Create game session in database
  const gameSession = await db.gameSession.create({
    data: {
      sessionCode,
      hostUserId: client.userId,
      gameState: {
        players: [{
          userId: client.userId,
          position: { x: 0, y: 0 },
          health: 100,
          score: 0,
          isReady: false,
        }],
        gamePhase: 'waiting',
        round: 1,
        scores: {},
      },
      maxPlayers,
      currentPlayers: 1,
      isActive: true,
    },
  });
  
  // Create game room
  const gameRoom: GameRoom = {
    sessionCode,
    hostUserId: client.userId,
    clients: new Set([client]),
    gameState: gameSession.gameState as GameState,
  };
  
  gameRooms.set(sessionCode, gameRoom);
  client.sessionCode = sessionCode;
  
  // Add player score record
  await db.playerScore.create({
    data: {
      userId: client.userId,
      gameSessionId: gameSession.id,
      score: 0,
    },
  });
  
  // Notify client
  client.socket.send(JSON.stringify({
    type: 'game_created',
    payload: {
      sessionCode,
      gameState: gameRoom.gameState,
      players: [{
        userId: client.userId,
        username: client.username,
      }],
    },
  }));
  
  console.log(`Game created: ${sessionCode} by ${client.username}`);
};

const handleJoinGame = async (client: ClientConnection, payload: any) => {
  const { sessionCode } = payload;
  
  const gameRoom = gameRooms.get(sessionCode);
  if (!gameRoom) {
    client.socket.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Game session not found' },
    }));
    return;
  }
  
  // Check if game is full
  if (gameRoom.clients.size >= gameRoom.gameState.players.length) {
    client.socket.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Game is full' },
    }));
    return;
  }
  
  // Check if player already in game
  for (const existingClient of gameRoom.clients) {
    if (existingClient.userId === client.userId) {
      client.socket.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Already in this game' },
      }));
      return;
    }
  }
  
  // Add client to room
  gameRoom.clients.add(client);
  client.sessionCode = sessionCode;
  
  // Add player to game state
  gameRoom.gameState.players.push({
    userId: client.userId,
    position: { x: 0, y: 0 },
    health: 100,
    score: 0,
    isReady: false,
  });
  
  // Update database
  const gameSession = await db.gameSession.findUnique({
    where: { sessionCode },
  });
  
  if (gameSession) {
    await db.playerScore.create({
      data: {
        userId: client.userId,
        gameSessionId: gameSession.id,
        score: 0,
      },
    });
    
    await db.gameSession.update({
      where: { id: gameSession.id },
      data: {
        currentPlayers: gameRoom.clients.size,
        gameState: gameRoom.gameState,
      },
    });
  }
  
  // Notify all clients in room
  broadcastToRoom(sessionCode, {
    type: 'player_joined',
    payload: {
      userId: client.userId,
      username: client.username,
      gameState: gameRoom.gameState,
    },
  });
  
  console.log(`User ${client.username} joined game ${sessionCode}`);
};

const handleLeaveGame = async (client: ClientConnection, payload: any) => {
  const { sessionCode } = payload;
  
  const gameRoom = gameRooms.get(sessionCode);
  if (!gameRoom) {
    return;
  }
  
  // Remove client from room
  gameRoom.clients.delete(client);
  client.sessionCode = undefined;
  
  // Remove player from game state
  gameRoom.gameState.players = gameRoom.gameState.players.filter(
    player => player.userId !== client.userId
  );
  
  // Update database
  const gameSession = await db.gameSession.findUnique({
    where: { sessionCode },
  });
  
  if (gameSession) {
    await db.playerScore.deleteMany({
      where: {
        userId: client.userId,
        gameSessionId: gameSession.id,
      },
    });
    
    await db.gameSession.update({
      where: { id: gameSession.id },
      data: {
        currentPlayers: gameRoom.clients.size,
        gameState: gameRoom.gameState,
      },
    });
  }
  
  // Notify remaining clients
  broadcastToRoom(sessionCode, {
    type: 'player_left',
    payload: {
      userId: client.userId,
      username: client.username,
      gameState: gameRoom.gameState,
    },
  });
  
  // Clean up empty rooms
  if (gameRoom.clients.size === 0) {
    gameRooms.delete(sessionCode);
    
    if (gameSession) {
      await db.gameSession.update({
        where: { id: gameSession.id },
        data: { isActive: false },
      });
    }
    
    console.log(`Game session ${sessionCode} ended (no players)`);
  }
  
  console.log(`User ${client.username} left game ${sessionCode}`);
};

const handleGameAction = async (client: ClientConnection, payload: any) => {
  const { sessionCode, action } = payload;
  
  const gameRoom = gameRooms.get(sessionCode);
  if (!gameRoom) {
    client.socket.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Game session not found' },
    }));
    return;
  }
  
  // Process game action
  // This is where game-specific logic would go
  console.log(`Game action from ${client.username}:`, action);
  
  // For now, just broadcast the action
  broadcastToRoom(sessionCode, {
    type: 'game_action',
    payload: {
      userId: client.userId,
      action,
      timestamp: Date.now(),
    },
  });
};

const handleChatMessage = async (client: ClientConnection, payload: any) => {
  const { sessionCode, message } = payload;
  
  const gameRoom = gameRooms.get(sessionCode);
  if (!gameRoom) {
    return;
  }
  
  // Broadcast chat message to room
  broadcastToRoom(sessionCode, {
    type: 'chat_message',
    payload: {
      userId: client.userId,
      username: client.username,
      message,
      timestamp: Date.now(),
    },
  });
};

const handleReadyState = async (client: ClientConnection, payload: any) => {
  const { sessionCode, isReady } = payload;
  
  const gameRoom = gameRooms.get(sessionCode);
  if (!gameRoom) {
    return;
  }
  
  // Update player ready state
  const playerIndex = gameRoom.gameState.players.findIndex(
    player => player.userId === client.userId
  );
  
  if (playerIndex !== -1) {
    gameRoom.gameState.players[playerIndex].isReady = isReady;
    
    // Check if all players are ready to start game
    const allReady = gameRoom.gameState.players.every(player => player.isReady);
    if (allReady && gameRoom.gameState.players.length >= 2) {
      gameRoom.gameState.gamePhase = 'playing';
      gameRoom.gameState.startedAt = new Date();
      
      broadcastToRoom(sessionCode, {
        type: 'game_started',
        payload: {
          gameState: gameRoom.gameState,
        },
      });
    }
    
    // Broadcast ready state update
    broadcastToRoom(sessionCode, {
      type: 'ready_state_updated',
      payload: {
        userId: client.userId,
        isReady,
        gameState: gameRoom.gameState,
      },
    });
  }
};

const handleDisconnection = (client: ClientConnection) => {
  console.log(`User ${client.username} disconnected`);
  
  // Remove from clients map
  clients.delete(client.socket);
  
  // Handle leaving game if in one
  if (client.sessionCode) {
    const gameRoom = gameRooms.get(client.sessionCode);
    if (gameRoom) {
      gameRoom.clients.delete(client);
      
      // Update game state
      gameRoom.gameState.players = gameRoom.gameState.players.filter(
        player => player.userId !== client.userId
      );
      
      // Notify remaining players
      broadcastToRoom(client.sessionCode, {
        type: 'player_disconnected',
        payload: {
          userId: client.userId,
          username: client.username,
        },
      });
      
      // Clean up empty rooms
      if (gameRoom.clients.size === 0) {
        gameRooms.delete(client.sessionCode);
      }
    }
  }
};

const broadcastToRoom = (sessionCode: string, message: any) => {
  const gameRoom = gameRooms.get(sessionCode);
  if (!gameRoom) {
    return;
  }
  
  const messageStr = JSON.stringify(message);
  
  for (const client of gameRoom.clients) {
    try {
      client.socket.send(messageStr);
    } catch (error) {
      console.error('Error broadcasting to client:', error);
    }
  }
};

const generateSessionCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};