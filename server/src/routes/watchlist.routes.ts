import express from 'express';
import { 
  getWatchlists, 
  createWatchlist, 
  syncWatchlists, 
  deleteWatchlist,
  addEntityToWatchlist,
  removeEntityFromWatchlist,
  syncWatchlistEntities
} from '../controllers/watchlist.controllers.js';
import { protect } from '../middlewares/protect.js';

const router: express.Router = express.Router();
router.use(protect);

// Watchlist collection routes
router.route('/')
  .get(getWatchlists)
  .post(createWatchlist)
  .put(syncWatchlists);

// Single watchlist routes
router.route('/:id')
  .delete(deleteWatchlist);

// Watchlist Entities routes
router.route('/:id/entities')
  .post(addEntityToWatchlist)
  .put(syncWatchlistEntities);

// Remove specific entity by its ISIN
router.route('/:id/entities/:isin')
  .delete(removeEntityFromWatchlist);

export default router;