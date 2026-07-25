import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { AppError } from '../utils/AppError.js'; // Adjust path to your AppError

export const checkMarketStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const upstoxToken = process.env.UPSTOX_ACCESS_TOKEN;
    if (!upstoxToken) {
      return next(new AppError('Upstox API token is missing in server configuration', 500));
    }

    // 🔥 FIX: Correct URL for Upstox V2 Market Status API
    const response = await axios.get('https://api.upstox.com/v2/market/status/NSE', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${upstoxToken}`
      }
    });

    const marketData = response.data?.data;

    // Fallback if data is null or unexpected
    if (!marketData || !Array.isArray(marketData)) {
       return res.status(200).json({
         status: 'success',
         data: { isMarketOpen: false, segments: {}, timestamp: new Date().toISOString() }
       });
    }
    
    // Check if any major segment is currently active
    const isAnySegmentOpen = marketData.some(
      (segment: any) => segment.status === 'open' || segment.status === 'pre_open'
    );

    // Map the status array into a clean dictionary
    const segmentStatusDict: Record<string, string> = {};
    marketData.forEach((item: any) => {
      segmentStatusDict[item.exchange] = item.status; 
    });

    res.status(200).json({
      status: 'success',
      data: {
        isMarketOpen: isAnySegmentOpen,
        segments: segmentStatusDict,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("Upstox Market Status API Error:", error.response?.data || error.message);
    next(new AppError('Failed to fetch market status from Upstox', 502));
  }
};

export const getMarketQuotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { instrumentKeys } = req.query; 
    
    if (!instrumentKeys || typeof instrumentKeys !== 'string') {
      return next(new AppError('Please provide a comma-separated list of instrumentKeys', 400));
    }

    const upstoxToken = process.env.UPSTOX_ACCESS_TOKEN;
    if (!upstoxToken) {
      return next(new AppError('Upstox API token is missing', 500));
    }

    // 1. Convert comma-separated string into an array and clean up whitespace
    const keysArray = instrumentKeys.split(',').map(key => key.trim()).filter(Boolean);

    // 2. Chunk the array into batches of 100 to prevent URL length limits and Upstox API limits (Max 500)
    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < keysArray.length; i += BATCH_SIZE) {
      batches.push(keysArray.slice(i, i + BATCH_SIZE));
    }

    // 3. Create a request promise for each batch
    const fetchPromises = batches.map(batch => {
      return axios.get('https://api.upstox.com/v2/market-quote/quotes', {
        params: { instrument_key: batch.join(',') }, // Re-join the batch into a comma string
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${upstoxToken}`
        }
      });
    });

    // 4. Execute all requests concurrently for blazing fast performance
    const responses = await Promise.all(fetchPromises);

    // 5. Merge all the separate batch responses into one single data object
    let mergedData = {};
    responses.forEach(response => {
      if (response.data && response.data.data) {
        mergedData = { ...mergedData, ...response.data.data };
      }
    });

    res.status(200).json({
      status: 'success',
      data: mergedData,
      total_instruments_fetched: Object.keys(mergedData).length
    });

  } catch (error: any) {
    console.error("Upstox Quote API Error:", error.response?.data || error.message);
    next(new AppError('Failed to fetch static market quotes', 502));
  }
};