import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { upstoxStream } from '../services/upstoxSocket.js';

export const initializeSocketServer = (httpServer: HttpServer, allowedOrigins: string[]) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // 1. Listen for live ticks from Upstox and Fan-Out to Frontend
  upstoxStream.on('market_tick', (feeds: Record<string, unknown>) => {
    Object.keys(feeds).forEach((instrumentKey) => {
      // Broadcast ONLY to the specific room matching the instrumentKey
      io.to(instrumentKey).emit('live_price', {
        instrumentKey,
        data: feeds[instrumentKey]
      });
    });
  });

  // 2. Handle Frontend Connections
  io.on('connection', (socket) => {
    console.log(`⚡ Frontend Client Connected: ${socket.id}`);

    // Handle Subscription Requests from Frontend
    socket.on('subscribe_instruments', (items: { isin: string; segment: string }[]) => {
      const newSubscriptions: string[] = [];

      items.forEach(item => {
        const instrumentKey = `${item.segment}|${item.isin}`;
        socket.join(instrumentKey); // Add user to the socket room

        // If room size is 1, it's a brand new global subscription
        const roomSize = io.sockets.adapter.rooms.get(instrumentKey)?.size;
        if (roomSize === 1) {
          newSubscriptions.push(instrumentKey);
        }
      });

      // Forward to Upstox
      if (newSubscriptions.length > 0) {
        upstoxStream.subscribe(newSubscriptions);
      }
    });

    // Handle Explicit Unsubscription
    socket.on('unsubscribe_instruments', (items: { isin: string; segment: string }[]) => {
      const keysToUnsub: string[] = [];

      items.forEach(item => {
        const instrumentKey = `${item.segment}|${item.isin}`;
        socket.leave(instrumentKey); 

        // If room size is undefined, no one is watching it anymore
        if (!io.sockets.adapter.rooms.has(instrumentKey)) {
          keysToUnsub.push(instrumentKey);
        }
      });

      if (keysToUnsub.length > 0) {
        upstoxStream.unsubscribe(keysToUnsub);
      }
    });

    // Handle Cleanup on Tab Close / Disconnect
    socket.on('disconnecting', () => {
      const keysToUnsub: string[] = [];
      
      // socket.rooms is a Set containing the socket ID and the rooms it joined
      socket.rooms.forEach(room => {
        if (room !== socket.id) { // Ignore the default personal socket room
          const roomSize = io.sockets.adapter.rooms.get(room)?.size;
          if (roomSize === 1) { // If size is 1, this socket is the LAST one leaving
            keysToUnsub.push(room);
          }
        }
      });

      if (keysToUnsub.length > 0) {
         upstoxStream.unsubscribe(keysToUnsub);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client Disconnected: ${socket.id}`);
    });
  });

  return io;
};