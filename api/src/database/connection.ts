import { PrismaClient } from '@prisma/client';
import { User, GameSession, PlayerScore, Leaderboard } from '@prisma/client';

const prisma = new PrismaClient();

export interface Database {
  user: typeof prisma.user;
  gameSession: typeof prisma.gameSession;
  playerScore: typeof prisma.playerScore;
  leaderboard: typeof prisma.leaderboard;
}

export const db: Database = {
  user: prisma.user,
  gameSession: prisma.gameSession,
  playerScore: prisma.playerScore,
  leaderboard: prisma.leaderboard,
};

export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test connection
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Create tables if they don't exist (Prisma handles this via migrations)
    // For development, we can run migrations automatically
    if (process.env.NODE_ENV === 'development') {
      await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
      console.log('Foreign keys enabled');
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('Database disconnected');
};

// Export Prisma client for direct use if needed
export { prisma };

// Export types
export type { User, GameSession, PlayerScore, Leaderboard };