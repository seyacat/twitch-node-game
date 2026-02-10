import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/connection';
import { validateToken } from '../auth/service';

export const userRoutes = async (fastify: FastifyInstance) => {
  // Get user profile (protected)
  fastify.get('/profile', {
    preHandler: [validateToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      
      const userData = await db.user.findUnique({
        where: { id: user.userId },
        select: {
          id: true,
          twitchId: true,
          username: true,
          displayName: true,
          profileImageUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      if (!userData) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
        });
      }
      
      return reply.send({
        success: true,
        user: userData,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch user profile',
      });
    }
  });

  // Get user game statistics (protected)
  fastify.get('/stats', {
    preHandler: [validateToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      
      // Get leaderboard entry
      const leaderboard = await db.leaderboard.findUnique({
        where: { userId: user.userId },
      });
      
      // Get game sessions count
      const hostedGames = await db.gameSession.count({
        where: { hostUserId: user.userId },
      });
      
      // Get player scores
      const playerScores = await db.playerScore.findMany({
        where: { userId: user.userId },
        include: {
          gameSession: true,
        },
      });
      
      const totalGames = playerScores.length;
      const totalScore = playerScores.reduce((sum, ps) => sum + ps.score, 0);
      const averageScore = totalGames > 0 ? totalScore / totalGames : 0;
      
      // Calculate wins (simplified - in real app you'd have proper win logic)
      const wins = leaderboard?.wins || 0;
      
      return reply.send({
        success: true,
        stats: {
          gamesPlayed: totalGames,
          hostedGames,
          totalScore,
          averageScore: Math.round(averageScore * 100) / 100,
          wins,
          losses: totalGames - wins,
          winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
        },
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch user statistics',
      });
    }
  });

  // Update user profile (protected)
  fastify.put('/profile', {
    preHandler: [validateToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { displayName } = request.body as { displayName?: string };
      
      const updatedUser = await db.user.update({
        where: { id: user.userId },
        data: {
          displayName: displayName?.trim() || undefined,
        },
        select: {
          id: true,
          twitchId: true,
          username: true,
          displayName: true,
          profileImageUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      return reply.send({
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update profile',
      });
    }
  });

  // Get leaderboard
  fastify.get('/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit = 10, offset = 0 } = request.query as { limit?: number; offset?: number };
      
      const leaderboardEntries = await db.leaderboard.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              profileImageUrl: true,
            },
          },
        },
        orderBy: { totalScore: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      });
      
      const formattedLeaderboard = leaderboardEntries.map((entry, index) => ({
        rank: offset + index + 1,
        userId: entry.userId,
        username: entry.user.username,
        displayName: entry.user.displayName,
        profileImageUrl: entry.user.profileImageUrl,
        totalScore: entry.totalScore,
        gamesPlayed: entry.gamesPlayed,
        wins: entry.wins,
        winRate: entry.gamesPlayed > 0 ? (entry.wins / entry.gamesPlayed) * 100 : 0,
        updatedAt: entry.updatedAt,
      }));
      
      return reply.send({
        success: true,
        leaderboard: formattedLeaderboard,
        count: formattedLeaderboard.length,
        total: await db.leaderboard.count(),
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch leaderboard',
      });
    }
  });
};