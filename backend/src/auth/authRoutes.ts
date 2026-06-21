import { Router } from 'express';
import {
  registerController,
  loginController,
  logoutController,
  refreshController,
  meController,
} from './authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerController);
router.post('/login', loginController);
router.post('/logout', authenticate, logoutController);
router.post('/refresh', refreshController);
router.get('/me', authenticate, meController);

export default router;
