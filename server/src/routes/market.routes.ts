import { Router } from 'express';
import { checkMarketStatus, getMarketQuotes } from '../controllers/market.controller.js';

const router:Router = Router();

// 1. Check if the market is open or closed (Proxies Upstox V2 Status API)
// GET /api/market/status
router.get('/status', checkMarketStatus);

// 2. Get static closing prices for a list of instruments (Proxies Upstox V2 Quotes API)
// GET /api/market/quotes?instrumentKeys=NSE_EQ|INE123...,NSE_EQ|INE456...
router.get('/quotes', getMarketQuotes);

export default router;