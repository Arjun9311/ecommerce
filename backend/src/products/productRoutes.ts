import { Router } from 'express';
import {
  getProductsController,
  getProductController,
  getCategoriesController,
} from './productController.js';

const router = Router();

router.get('/', getProductsController);
router.get('/categories', getCategoriesController);
router.get('/:id', getProductController);

export default router;
