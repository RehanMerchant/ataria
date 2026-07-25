import type { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { redisClient } from '../config/redis.js';
import { sendOtpEmail } from '../services/email.service.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { oauthAccounts, users } from '../db/schema.js';
import bcrypt from 'bcrypt';
import {OAuth2Client} from 'google-auth-library'



export const sendOtp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide an email address', 400));
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  const ipKey = `rate_limit:ip:${clientIp}`;
  const ipAttempts = await redisClient.incr(ipKey);

  if (ipAttempts === 1) {
    await redisClient.expire(ipKey, 1800);
  }

  if (ipAttempts > 5) {
    const ttl = await redisClient.ttl(ipKey);
    const minutesLeft = Math.ceil(ttl / 60);
    return next(new AppError(`Too many requests from this network. Try again in ${minutesLeft} minutes.`, 429));
  }

  const emailKey = `rate_limit:email:${email}`;
  const emailAttempts = await redisClient.incr(emailKey);

  if (emailAttempts === 1) {
    await redisClient.expire(emailKey, 1800);
  }

  if (emailAttempts > 3) {
    const ttl = await redisClient.ttl(emailKey);
    const minutesLeft = Math.ceil(ttl / 60);
    return next(new AppError(`Too many OTPs requested for this email. Try again in ${minutesLeft} minutes.`, 429));
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const redisKey = `otp:${email}`;
  
  await redisClient.setEx(redisKey, 300, otpCode); 
  await sendOtpEmail(email, otpCode);

  res.status(200).json({
    status: 'success',
    message: 'Verification code sent to your email.',
  });
});


export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, otp } = req.body;

  if (!name || !email || !otp) {
    return next(new AppError('Please provide name, email, and OTP', 400));
  }

  const storedOtp = await redisClient.get(`otp:${email}`);
  if (!storedOtp || storedOtp !== otp) {
    return next(new AppError('Invalid or expired OTP', 400));
  }

  const existingUser = (await db.select().from(users).where(eq(users.email, email)))[0];
  if (existingUser) {
    return next(new AppError('Email already registered. Please login instead.', 409));
  }

  const newUser = await db.insert(users).values({ 
    name,
    email, 
    emailVerified: new Date() 
  }).returning();
  
  const user = newUser[0]!;
  await redisClient.del(`otp:${email}`);

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await redisClient.setEx(`refresh:${user.id}`, 604800, refreshToken);

  // Set Refresh Token Cookie (7 days)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 604800000 
  });

  // Set Access Token Cookie (15 mins)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 
  });

  // Do not send tokens in the JSON response anymore!
  res.status(201).json({
    status: 'success',
    data: { user: { id: user.id, name: user.name, email: user.email } }
  });
});


export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, otp } = req.body;

  if (!email || (!password && !otp)) {
    return next(new AppError('Please provide email and either password or OTP', 400));
  }

  const user = (await db.select().from(users).where(eq(users.email, email)))[0];
  if (!user) {
    return next(new AppError('Incorrect email or password', 404));
  }

  if (password) {
    if (!user.password) {
      return next(new AppError('No password set. Please login via OTP.', 400));
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return next(new AppError('Incorrect email or password', 422));
  } else {
    const storedOtp = await redisClient.get(`otp:${email}`);
    if (!storedOtp || storedOtp !== otp) {
      return next(new AppError('Invalid or expired OTP', 400));
    }
    await redisClient.del(`otp:${email}`);
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await redisClient.setEx(`refresh:${user.id}`, 604800, refreshToken);

  // Set Refresh Token Cookie (7 days)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 604800000
  });

  // Set Access Token Cookie (59 mins)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 59 * 60 * 1000
  });

  // Do not send tokens in the JSON response anymore!
  res.status(200).json({
    status: 'success',
    data: { user: { id: user.id, name: user.name, email: user.email } }
  });
});


export const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const { password, ...userWithoutPassword } = user;

  res.status(200).json({
    status: 'success',
    data: {
      user: userWithoutPassword
    }
  });
});


export const setPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { password } = req.body;

  if (!password || password.length < 8) {
    return next(new AppError('Please provide a password that is at least 8 characters long.', 400));
  }

  if (!req.user) {
    return next(new AppError('You must be logged in to set a password.', 401));
  }

  const rateLimitKey = `rate_limit:password_update:${req.user.id}`;
  
  // 1. Check current attempts BEFORE running expensive bcrypt math
  const currentAttempts = await redisClient.get(rateLimitKey);
  
  if (currentAttempts && parseInt(currentAttempts) >= 3) {
    const ttl = await redisClient.ttl(rateLimitKey);
    const hoursLeft = Math.ceil(ttl / 3600);
    
    return next(new AppError(`Maximum password updates reached. Please try again in ${hoursLeft} hours.`, 429));
  }

  const hashedPassword = await bcrypt.hash(password, 12);


  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, req.user.id));

  const attempts = await redisClient.incr(rateLimitKey);
  if (attempts === 1) {
    await redisClient.expire(rateLimitKey, 86400); 
  }

  res.status(200).json({
    status: 'success',
    message: 'Password has been set successfully.',
  });
});


export const logout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (userId) {
    await redisClient.del(`refresh:${userId}`);
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});


export const googleLogin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('No Google token provided', 400));
  }

  let payload;
  try {
    // 1. Fetch user data from Google using the Access Token
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!googleResponse.ok) {
      throw new Error('Failed to fetch user profile from Google');
    }

    payload = await googleResponse.json();
  } catch (error) {
    return next(new AppError('Invalid Google access token', 401));
  }

  // 2. Validate the required fields exist
  if (!payload || !payload.email || !payload.sub) {
    return next(new AppError('Could not retrieve required data from Google', 400));
  }

  // 'sub' acts as the unique Google ID
  const { email, name, sub: googleId } = payload;

  // 3. Database operations (Drizzle ORM)
  let user = (await db.select().from(users).where(eq(users.email, email)))[0];

  if (!user) {
    const newUser = await db.insert(users).values({
      email,
      name: name || 'Google User',
      emailVerified: new Date(), 
    }).returning();
    
    user = newUser[0]!;

    await db.insert(oauthAccounts).values({
      userId: user.id,
      provider: 'google',
      providerAccountId: googleId,
    });

  } else {
    const existingOAuth = (await db.select().from(oauthAccounts).where(
      and(
        eq(oauthAccounts.userId, user.id),
        eq(oauthAccounts.provider, 'google')
      )
    ))[0];

    if (!existingOAuth) {
      await db.insert(oauthAccounts).values({
        userId: user.id,
        provider: 'google',
        providerAccountId: googleId,
      });
    }
  }

  // 4. Token Generation & Redis
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  
  await redisClient.setEx(`refresh:${user.id}`, 604800, refreshToken);

  // 5. Set HttpOnly Cookies
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 604800000
  });

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  // 6. Return Success Response
  res.status(200).json({
    status: 'success',
    data: { 
      user: { id: user.id, name: user.name, email: user.email } 
    }
  });
});