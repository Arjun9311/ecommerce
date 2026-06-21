import { Router } from 'express';
import {
  searchController,
  suggestController,
  facetsController,
  semanticSearchController,
} from './searchController.js';

const router = Router();

router.get('/', searchController);
router.get('/suggest', suggestController);
router.get('/facets', facetsController);
router.get('/semantic', semanticSearchController);

export default router;
