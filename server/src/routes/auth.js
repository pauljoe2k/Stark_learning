import { Router } from 'express';
import { getMe, login, resetPassword, signup, updateMe } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/forgot-password', resetPassword);
router.get('/me', auth, getMe);
router.patch('/me', auth, updateMe);

export default router;