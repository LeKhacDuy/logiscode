import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../data/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_edumanage_2026_key';

export const login = (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu.' });
  }

  const users = db.get('users');
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !user.passwordHash) {
    return res.status(400).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
  }

  // CHECK LOCKED USER PRE-LOGIN
  if (user.status === 'lock') {
    return res.status(403).json({
      success: false,
      message: 'Tài khoản của bạn đang trong trạng thái bị KHÓA. Không thể đăng nhập vào hệ thống.'
    });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(400).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const { passwordHash, ...userWithoutPassword } = user;

  return res.status(200).json({
    success: true,
    message: 'Đăng nhập thành công!',
    token,
    user: userWithoutPassword
  });
};

export const getMe = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
  }
  const { passwordHash, ...userWithoutPassword } = req.user;
  return res.status(200).json({
    success: true,
    user: userWithoutPassword
  });
};
