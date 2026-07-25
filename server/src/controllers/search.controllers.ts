import type { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';

// --- GET: Search Instruments via Upstox API ---
export const searchInstruments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { query } = req.query;

  // 1. Validate the incoming search string
  if (!query || typeof query !== 'string') {
    return next(new AppError('Please provide a valid search query', 400));
  }

  // 2. Build the Upstox API URL
  const upstoxUrl = new URL('https://api.upstox.com/v2/instruments/search');
  upstoxUrl.searchParams.append('query', query);
  upstoxUrl.searchParams.append('records', '5'); // Limit to 5 suggestions from the source
  
  // 🔥 ADDED: Filter to only return Equity segments (Ignores FO, COMM, CURR)
  upstoxUrl.searchParams.append('segments', 'EQ'); 

  try {
    // 3. Make the request to Upstox
    const response = await fetch(upstoxUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.UPSTOX_ACCESS_TOKEN}` 
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Upstox API Error:', errorData);
      return next(new AppError('Failed to fetch instruments from Upstox', response.status));
    }

    const json = await response.json();

    // 4. Map the Upstox payload to exactly what the frontend needs
    const suggestions = (json.data || []).map((item: any) => ({
      name: item.name || '',
      segment: item.segment || '',
      exchange: item.exchange || '',
      isin: item.isin || '',
      trading_symbol: item.trading_symbol || ''
    }));

    // 5. Return the clean 5-item array to the frontend
    res.status(200).json({
      status: 'success',
      data: suggestions
    });

  } catch (error) {
    console.error('Instrument search error:', error);
    return next(new AppError('An error occurred while communicating with Upstox API', 500));
  }
});