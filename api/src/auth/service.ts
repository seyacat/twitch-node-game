import jwt from 'jsonwebtoken';
import { db } from '../database/connection';
import { AuthResponse, User } from '@shared';

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_USER_INFO_URL = 'https://api.twitch.tv/helix/users';

export const authenticateWithTwitch = (): string => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  const scopes = ['user:read:email', 'user:read:subscriptions'];
  
  if (!clientId || !redirectUri) {
    throw new Error('Twitch OAuth configuration missing');
  }
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    force_verify: 'false',
  });
  
  return `${TWITCH_AUTH_URL}?${params.toString()}`;
};

export const handleTwitchCallback = async (code: string): Promise<AuthResponse> => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Twitch OAuth configuration missing');
  }
  
  // Exchange code for access token
  const tokenResponse = await fetch(TWITCH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to exchange code for token: ${errorText}`);
  }
  
  const tokenData = await tokenResponse.json();
  const { access_token, refresh_token } = tokenData;
  
  // Get user info from Twitch
  const userResponse = await fetch(TWITCH_USER_INFO_URL, {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Client-Id': clientId,
    },
  });
  
  if (!userResponse.ok) {
    throw new Error('Failed to fetch user info from Twitch');
  }
  
  const userData = await userResponse.json();
  const twitchUser = userData.data[0];
  
  // Create or update user in database
  let user = await db.user.findUnique({
    where: { twitchId: twitchUser.id },
  });
  
  if (!user) {
    user = await db.user.create({
      data: {
        twitchId: twitchUser.id,
        username: twitchUser.login,
        displayName: twitchUser.display_name,
        profileImageUrl: twitchUser.profile_image_url,
        accessToken: access_token,
        refreshToken: refresh_token,
      },
    });
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        username: twitchUser.login,
        displayName: twitchUser.display_name,
        profileImageUrl: twitchUser.profile_image_url,
        accessToken: access_token,
        refreshToken: refresh_token,
      },
    });
  }
  
  // Generate JWT token
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret not configured');
  }
  
  const token = jwt.sign(
    {
      userId: user.id,
      twitchId: user.twitchId,
      username: user.username,
    },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  const authResponse: AuthResponse = {
    token,
    user: {
      id: user.id,
      twitchId: user.twitchId,
      username: user.username,
      displayName: user.displayName || user.username,
      profileImageUrl: user.profileImageUrl || '',
      createdAt: user.createdAt,
    },
    expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
  };
  
  return authResponse;
};

export const refreshToken = async (refreshToken: string): Promise<string> => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret not configured');
  }
  
  try {
    // Verify the refresh token (in a real app, you might store refresh tokens in DB)
    const decoded = jwt.verify(refreshToken, jwtSecret) as any;
    
    // Generate new access token
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const newToken = jwt.sign(
      {
        userId: user.id,
        twitchId: user.twitchId,
        username: user.username,
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    return newToken;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

export const validateToken = async (request: any, reply: any, done: any) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      return reply.status(500).send({ error: 'Server configuration error' });
    }
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Attach user to request
    request.user = decoded;
    
    done();
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
};