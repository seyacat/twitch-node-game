import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { authRoutes } from './auth/routes';
import { gameRoutes } from './game/routes';
import { userRoutes } from './user/routes';
import { setupWebSocket } from './websocket/server';
import { initializeDatabase } from './database/connection';

// Load environment variables
dotenv.config();

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register plugins
server.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

server.register(websocket);

// Register routes
server.register(authRoutes, { prefix: '/auth' });
server.register(gameRoutes, { prefix: '/api/game' });
server.register(userRoutes, { prefix: '/api/user' });

// Setup WebSocket
server.register(async (instance) => {
  instance.get('/ws', { websocket: true }, (connection, req) => {
    setupWebSocket(connection, req);
  });
});

// Health check endpoint
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    
    console.log(`Server running on http://${host}:${port}`);
    console.log(`WebSocket available on ws://${host}:${port}/ws`);
    console.log(`Health check: http://${host}:${port}/health`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await server.close();
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { server };