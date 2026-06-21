import { Response } from 'express';
import { AuthService } from './authService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export async function registerController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email, password, firstName, lastName } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ error: 'BadRequest', message: 'All registration fields are required' });
    return;
  }

  try {
    const user = await AuthService.register(email, password, firstName, lastName);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error: any) {
    logger.error('Registration failed controller', error);
    res.status(400).json({ error: 'Conflict', message: error.message });
  }
}

export async function loginController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'BadRequest', message: 'Email and password are required' });
    return;
  }

  try {
    const data = await AuthService.login(email, password);
    res.status(200).json({
      message: 'Login successful',
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
  } catch (error: any) {
    res.status(401).json({ error: 'Unauthorized', message: error.message });
  }
}

export async function logoutController(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || !req.sessionId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated' });
    return;
  }

  try {
    await AuthService.logout(req.user.id, req.sessionId);
    res.status(200).json({ message: 'Logout successful' });
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function refreshController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'BadRequest', message: 'Refresh token is required' });
    return;
  }

  try {
    const data = await AuthService.refresh(refreshToken);
    res.status(200).json(data);
  } catch (error: any) {
    res.status(401).json({ error: 'Unauthorized', message: error.message });
  }
}

export async function meController(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated' });
    return;
  }

  try {
    const profile = await AuthService.getProfile(req.user.id);
    if (!profile) {
      res.status(404).json({ error: 'NotFound', message: 'User profile not found' });
      return;
    }
    res.status(200).json(profile);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}
