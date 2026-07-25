import express from 'express';
import { getMe, googleLogin, login, logout, register, sendOtp, setPassword } from '../controllers/auth.controllers.js';
import { protect } from '../middlewares/protect.js';

const router: express.Router = express.Router();


router.post('/otp/send', sendOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.patch('/set-password', protect, setPassword);
router.post('/logout', protect, logout);

export default router;