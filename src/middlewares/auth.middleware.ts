import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../data/db';
import { User, Role } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_edumanage_2026_key';

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng cung cấp mã xác thực JWT token trong Header (Authorization: Bearer <token>).'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: Role };
    const users = db.get('users');
    const currentUser = users.find(u => u.id === decoded.id);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị xóa khỏi hệ thống.'
      });
    }

    // CHECK LOCKED STATUS RULE:
    // Khi khóa user, logout ngay lập tức và đăng nhập lại không được.
    if (currentUser.status === 'lock') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị KHÓA bởi Quản trị viên. Bạn đã bị đăng xuất tự động và không thể tiếp tục truy cập.'
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'JWT Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
    });
  }
};

export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện thao tác này. Quyền truy cập yêu cầu: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
};
