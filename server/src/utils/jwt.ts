import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;

export const generateAccessToken = (userId: number) => {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: '1m' });
};

export const generateRefreshToken = (userId: number) => {
  return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};