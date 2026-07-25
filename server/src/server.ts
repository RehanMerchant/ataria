import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { connectDB } from './db/index.js';
import { connectRedis } from './config/redis.js';
import { initializeSocketServer } from './socket/socketServer.js';
import { upstoxStream } from './services/upstoxSocket.js';

const PORT = process.env.PORT || 8000;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
];

// 1. Create HTTP Server wrapping Express app
const httpServer = createServer(app);

// 2. Attach Socket.io Gateway to the HTTP Server
initializeSocketServer(httpServer, allowedOrigins);

// 3. Debug Logger: Log whenever Upstox sends live market ticks to Node
upstoxStream.on('market_tick', (feeds: Record<string, any>) => {
  const updatedKeys = Object.keys(feeds);
  
  // OPTIONAL: Uncomment to inspect the full parsed payload in console
  // console.log(JSON.stringify(feeds, null, 2));
});

// 4. Database Initialization & Server Startup
async function startServer() {
  try {
    // Ensure DB and Redis connect before listening
    await connectDB();

    await connectRedis();

    // Listen on httpServer (Not app.listen)
    httpServer.listen(PORT, () => {
      console.log('\x1b[33m%s\x1b[0m', `🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

      // 5. Connect to Upstox Stream after server starts
      const upstoxToken = process.env.UPSTOX_ACCESS_TOKEN;
      if (upstoxToken) {
        upstoxStream.connect(upstoxToken);
      } else {
        console.warn('\x1b[31m%s\x1b[0m', '⚠️ UPSTOX_ACCESS_TOKEN missing in .env! Stream will not start.');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server environment:', error);
    process.exit(1);
  }
}

startServer();

// 5. Graceful Shutdown on Unhandled Rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! Shutting down server...');
  console.error(err.name, err.message);
  httpServer.close(() => {
    process.exit(1);
  });
});