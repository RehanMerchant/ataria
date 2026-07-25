// src/middleware/protect.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { redisClient } from '../config/redis.js'; 
import { generateAccessToken } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
    }
  }
}

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { accessToken, refreshToken } = req.cookies || {};

  if (!accessToken && !refreshToken) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET!;
  const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;
  
  let decodedPayload: { userId: number } | null = null;

  // 2. Try verifying the Access Token first
  if (accessToken) {
    try {
      decodedPayload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as { userId: number };
    } catch (error) {
      // Token is expired or invalid. We don't throw an error yet! 
      // We let it fall through to the auto-refresh logic below.
      decodedPayload = null;
    }
  }

  // 3. AUTO-REFRESH: If the Access Token is dead or missing, check the Refresh Token
  if (!decodedPayload) {
    if (!refreshToken) {
      return next(new AppError('Session expired. Please log in again.', 401));
    }

    try {
      // Verify the Refresh Token signature
      const refreshDecoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { userId: number };

      // Double-check against Redis to ensure the token wasn't revoked on logout
      const storedToken = await redisClient.get(`refresh:${refreshDecoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid or revoked refresh token');
      }

      // SUCCESS! Generate a brand new Access Token
      const newAccessToken = generateAccessToken(refreshDecoded.userId);

      // Attach the new access token to the outgoing response so the browser updates it
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      // Set the payload so the route can proceed
      decodedPayload = { userId: refreshDecoded.userId };
    } catch (error) {
      // Total failure: Both tokens are dead, fake, or revoked.
      // Wipe the cookies to clean up the browser state.
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return next(new AppError('Session fully expired. Please log in again.', 401));
    }
  }

  // 4. Load the user from the database
  const currentUser = (await db.select().from(users).where(eq(users.id, decodedPayload.userId)))[0];

  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // Attach user to request and proceed to the route
  req.user = currentUser;
  next();
});