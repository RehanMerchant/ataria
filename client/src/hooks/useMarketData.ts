import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../api/axios'; // Adjust path if needed

// --- TYPES ---
export interface LtpcData {
  ltp: number;
  cp: number;
}

export interface LiveMarketData {
  ltpc?: LtpcData;
}

export interface SubscribePayload {
  isin: string;
  segment: string;
}

let globalSocket: Socket | null = null;

// --- HELPER: Dynamic Time-Based Cache ---
const getStatusCacheTTL = () => {
  // Get current time strictly in Indian Standard Time (IST)
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);
  
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 8:30 AM = 510 minutes | 3:30 PM = 930 minutes
  // If we are near market open or currently open, use a fast 1-minute cache.
  if (timeInMinutes >= 510 && timeInMinutes <= 930) {
    return 1 * 60 * 1000; // 1 minute in milliseconds
  }
  
  // Otherwise, the market is deeply closed (night/evening/early morning)
  return 30 * 60 * 1000; // 30 minutes in milliseconds
};

export const useMarketData = (instruments: SubscribePayload[]) => {
  const [livePrices, setLivePrices] = useState<Record<string, LiveMarketData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState<boolean | null>(null);

  // Create a stable string representation of our instruments for dependency arrays and cache keys
  const instrumentKeysString = instruments.map(i => `${i.segment}|${i.isin}`).join(',');

  // =================================================================
  // 1. CHECK STATUS & FETCH STATIC REST QUOTES (WITH DYNAMIC CACHING)
  // =================================================================
  useEffect(() => {
    if (!instrumentKeysString) return;

    const checkStatusAndFetch = async () => {
      try {
        let currentMarketStatus: boolean | null = null;
        const STATUS_CACHE_KEY = 'market_status_cache';
        
        // 1A. Check Session Storage for Market Status First
        const cachedStatusStr = sessionStorage.getItem(STATUS_CACHE_KEY);
        if (cachedStatusStr) {
          const cachedStatus = JSON.parse(cachedStatusStr);
          // Check if cache has expired
          if (Date.now() < cachedStatus.expiresAt) {
            currentMarketStatus = cachedStatus.isMarketOpen;
          }
        }

        // 1B. If Status Cache is missing or expired, fetch it from the backend
        if (currentMarketStatus === null) {
          const statusRes = await api.get('/market/status');
          currentMarketStatus = statusRes.data.data.isMarketOpen as boolean;
          
          // Save new status to session cache with our dynamic TTL logic
          const ttl = getStatusCacheTTL();
          sessionStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({
            isMarketOpen: currentMarketStatus,
            expiresAt: Date.now() + ttl
          }));
        }

        // Update React State
        setIsMarketOpen(currentMarketStatus);

        // 2. If market is open, exit here and let the WebSocket effect handle data streaming
        if (currentMarketStatus) return;

        // --- MARKET IS CLOSED: REST FETCH WITH SESSION CACHING ---
        const QUOTES_CACHE_KEY = `market_quotes_${instrumentKeysString}`;
        
        // Try to pull quotes from session storage first
        const cachedQuotes = sessionStorage.getItem(QUOTES_CACHE_KEY);
        if (cachedQuotes) {
          setLivePrices(JSON.parse(cachedQuotes) as Record<string, LiveMarketData>);
          return; // Exit early! No need to hit the backend.
        }

        // If not in cache, fetch static quotes from backend
        const quotesRes = await api.get(`/market/quotes?instrumentKeys=${instrumentKeysString}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const staticData: Record<string, any> = quotesRes.data.data;
        
        const formattedPrices: Record<string, LiveMarketData> = {};
        
        Object.keys(staticData).forEach(key => {
          const instrumentToken = staticData[key].instrument_token;
          if (instrumentToken) {
             formattedPrices[instrumentToken] = {
               ltpc: {
                 ltp: staticData[key].last_price,
                 cp: staticData[key].ohlc.close
               }
             };
          }
        });
        
        setLivePrices(formattedPrices);
        sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(formattedPrices));

      } catch (error) {
        console.error("Failed to fetch market status or quotes:", error);
      }
    };

    checkStatusAndFetch();
  }, [instrumentKeysString]);


  // =================================================================
  // 2. WEBSOCKET CONNECTION (ONLY IF MARKET IS OPEN)
  // =================================================================
  useEffect(() => {
    if (isMarketOpen !== true || instruments.length === 0) return;

    if (!globalSocket) {
      globalSocket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:8000", {
        withCredentials: true,
      });
    }

    const socket = globalSocket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onLivePrice = (update: { instrumentKey: string; data: LiveMarketData }) => {
      if (update.data.ltpc) {
        setLivePrices((prev) => ({
          ...prev,
          [update.instrumentKey]: { ltpc: update.data.ltpc },
        }));
      }
    };

    // Attach listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('live_price', onLivePrice);

    if (socket.connected) setIsConnected(true);

    // Subscribe to requested instruments
    socket.emit("subscribe_instruments", instruments);

    // Cleanup listeners when component unmounts or instruments change
    return () => {
      socket.emit("unsubscribe_instruments", instruments);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('live_price', onLivePrice);
    };
  }, [isMarketOpen, instrumentKeysString]); 

  return { livePrices, isConnected, isMarketOpen };
};