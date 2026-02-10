import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/connection';
import { validateToken } from '../auth/service';

export const gameRoutes = async (fastify: FastifyInstance) => {
  // Get active game sessions
  fastify.get('/active', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const games = await db.gameSession.findMany({
        where: { isActive: true },
        include: {
          host: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      
      const formattedGames = games.map(game => ({
        sessionCode: game.sessionCode,
        hostUserId: game.hostUserId,
        hostUsername: game.host.username,
        maxPlayers: game.maxPlayers,
        currentPlayers: game.currentPlayers,
        isActive: game.isActive,
        createdAt: game.createdAt,
        status: (game.gameState as any)?.gamePhase || 'waiting',
      }));
      
      return reply.send({
        success: true,
        games: formattedGames,
        count: formattedGames.length,
      });
    } catch (error) {
      console.error('Error fetching active games:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch active games',
      });
    }
  });

  // Get game session details
  fastify.get('/:sessionCode', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionCode } = request.params as { sessionCode: string };
      
      const game = await db.gameSession.findUnique({
        where: { sessionCode },
        include: {
          host: {
            select: {
              id: true,
              username: true,
              displayName: true,
              profileImageUrl: true,
            },
          },
          playerScores: {
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
          },
        },
      });
      
      if (!game) {
        return reply.status(404).send({
          success: false,
          error: 'Game session not found',
        });
      }
      
      return reply.send({
        success: true,
        game: {
          sessionCode: game.sessionCode,
          host: game.host,
          gameState: game.gameState,
          maxPlayers: game.maxPlayers,
          currentPlayers: game.currentPlayers,
          isActive: game.isActive,
          createdAt: game.createdAt,
          players: game.playerScores.map(ps => ({
            user: ps.user,
            score: ps.score,
            joinedAt: ps.joinedAt,
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching game details:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch game details',
      });
    }
  });

  // Create game session (protected)
  fastify.post('/create', {
    preHandler: [validateToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { maxPlayers = 4 } = request.body as { maxPlayers?: number };
      
      // Generate session code
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let sessionCode = '';
      for (let i = 0; i < 6; i++) {
        sessionCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const game = await db.gameSession.create({
        data: {
          sessionCode,
          hostUserId: user.userId,
          gameState: {
            players: [{
              userId: user.userId,
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
        include: {
          host: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });
      
      // Create player score record
      await db.playerScore.create({
        data: {
          userId: user.userId,
          gameSessionId: game.id,
          score: 0,
        },
      });
      
      return reply.send({
        success: true,
        game: {
          sessionCode: game.sessionCode,
          host: game.host,
          gameState: game.gameState,
          maxPlayers: game.maxPlayers,
          currentPlayers: game.currentPlayers,
          isActive: game.isActive,
          createdAt: game.createdAt,
        },
        message: 'Game created successfully',
      });
    } catch (error) {
      console.error('Error creating game:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create game',
      });
    }
  });

  // Join game session (protected)
  fastify.post('/:sessionCode/join', {
    preHandler: [validateToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { sessionCode } = request.params as { sessionCode: string };
      
      const game = await db.gameSession.findUnique({
        where: { sessionCode },
        include: {
          playerScores: true,
        },
      });
      
      if (!game) {
        return reply.status(404).send({
          success: false,
          error: 'Game session not found',
        });
      }
      
      if (!game.isActive) {
        return reply.status(400).send({
          success: false,
          error: 'Game is not active',
        });
      }
      
      if (game.currentPlayers >= game.maxPlayers) {
        return reply.status(400).send({
          success: false,
          error: 'Game is full',
        });
      }
      
      // Check if user already in game
      const existingPlayer = await db.playerScore.findFirst({
        where: {
          userId: user.userId,
          gameSessionId: game.id,
        },
      });
      
      if (existingPlayer) {
        return reply.status(400).send({
          success: false,
          error: 'Already in this game',
        });
      }
      
      // Add player to game
      await db.playerScore.create({
        data: {
          userId: user.userId,
          gameSessionId: game.id,
          score: 0,
        },
      });
      
      // Update game state
      const gameState = game.gameState as any;
      gameState.players.push({
        userId: user.userId,
        position: { x: 0, y: 0 },
        health: 100,
        score: 0,
        isReady: false,
      });
      
      await db.gameSession.update({
        where: { id: game.id },
        data: {
          currentPlayers: game.currentPlayers + 1,
          gameState: gameState,
        },
      });
      
      return reply.send({
        success: true,
        message: 'Joined game successfully',
        game: {
          sessionCode: game.sessionCode,
          currentPlayers: game.currentPlayers + 1,
          maxPlayers: game.maxPlayers,
        },
      });
    } catch (error) {
      console.error('Error joining game:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to join game',
      });
    }
  });
};