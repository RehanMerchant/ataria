import express from 'express';
import { searchInstruments } from '../controllers/search.controllers.js';
import { protect } from '../middlewares/protect.js';

const router: express.Router = express.Router();

router.use(protect);

router.route('/search')
  .get(searchInstruments);

export default router;