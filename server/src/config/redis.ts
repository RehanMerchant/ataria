// src/config/redis.ts
import { createClient, type RedisClientType } from 'redis';

export const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL!,
});

// Handle connection events
redisClient.on('error', (err) => console.error('\x1b[31m%s\x1b[0m', 'Redis Client Error:', err));
redisClient.on('connect', () => console.log('\x1b[32m%s\x1b[0m', 'Redis Connected Successfully'));

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('Redis Initialization Failed:', error);
    process.exit(1);
  }
};