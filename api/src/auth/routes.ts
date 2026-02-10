import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthResponse } from '@shared';
import { authenticateWithTwitch, handleTwitchCallback, refreshToken, validateToken } from './service';

export const authRoutes = async (fastify: FastifyInstance) => {
  // Initiate Twitch OAuth flow
  fastify.get('/twitch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const redirectUrl = authenticateWithTwitch();
      return reply.redirect(redirectUrl);
    } catch (error) {
      console.error('Twitch auth initiation error:', error);
      return reply.status(500).send({ error: 'Failed to initiate Twitch authentication' });
    }
  });

  // Twitch OAuth callback
  fastify.get('/twitch/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { code, error, error_description } = request.query as any;
      
      if (error) {
        console.error('Twitch OAuth error:', error, error_description);
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error_description || error)}`);
      }
      
      if (!code) {
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=No authorization code provided`);
      }
      
      const authResponse = await handleTwitchCallback(code);
      
      // Redirect to frontend with token
      return reply.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(authResponse.token)}&user=${encodeURIComponent(JSON.stringify(authResponse.user))}`
      );
    } catch (error) {
      console.error('Twitch callback error:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=Authentication failed`);
    }
  });

  // Refresh JWT token
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };
      
      if (!refreshToken) {
        return reply.status(400).send({ error: 'Refresh token is required' });
      }
      
      const newToken = await refreshToken(refreshToken);
      
      return reply.send({
        success: true,
        token: newToken,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Validate token (for debugging/development)
  fastify.get('/validate', {
    preHandler: [validateToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    return reply.send({
      success: true,
      user,
      valid: true,
    });
  });

  // Logout (client-side only, but provides endpoint for clearing server-side if needed)
  fastify.post('/logout', {
    preHandler: [validateToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // In a real implementation, you might want to blacklist the token
    // For JWT without server-side storage, logout is client-side only
    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });
};