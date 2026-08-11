import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../data/db';
import { User, Role, UserStatus } from '../types';

export const getUsers = (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const role = (req.query.role as Role) || undefined;
  const status = (req.query.status as UserStatus) || undefined;

  let users = db.get('users');

  // Search by fullname or email
  if (search) {
    users = users.filter(
      u => u.fullname.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
    );
  }

  // Filter by role
  if (role) {
    users = users.filter(u => u.role === role);
  }

  // Filter by status
  if (status) {
    users = users.filter(u => u.status === status);
  }

  const total = users.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedData = users.slice(startIndex, startIndex + limit).map(u => {
    const { passwordHash, ...userClean } = u;
    return userClean;
  });

  return res.status(200).json({
    success: true,
    total,
    page,
    limit,
    totalPages,
    data: paginatedData
  });
};

export const createUser = (req: Request, res: Response) => {
  const { fullname, email, role, status = 'active', password = '123456' } = req.body;

  if (!fullname || !email || !role) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ fullname, email và chọn role.'
    });
  }

  const users = db.get('users');
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Email này đã tồn tại trong hệ thống.'
    });
  }

  const newUser: User = {
    id: `u-${Date.now()}`,
    fullname,
    email: email.toLowerCase(),
    role,
    status: status === 'lock' ? 'lock' : 'active',
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  db.update('users', users);

  const { passwordHash, ...userClean } = newUser;
  return res.status(201).json({
    success: true,
    message: 'Thêm tài khoản mới thành công!',
    data: userClean
  });
};

export const updateUser = (req: Request, res: Response) => {
  const { id } = req.params;
  const { fullname, status } = req.body;

  const users = db.get('users');
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
  }

  const user = users[userIndex];
  if (fullname !== undefined) user.fullname = fullname;
  if (status !== undefined) {
    if (status !== 'active' && status !== 'lock') {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ (active | lock).' });
    }
    user.status = status;
  }

  users[userIndex] = user;
  db.update('users', users);

  const { passwordHash, ...userClean } = user;
  return res.status(200).json({
    success: true,
    message: user.status === 'lock' 
      ? 'Đã cập nhật thông tin và KHÓA tài khoản thành công (Người dùng sẽ bị tự động logout).' 
      : 'Cập nhật tài khoản thành công!',
    data: userClean
  });
};

export const deleteUser = (req: Request, res: Response) => {
  const { id } = req.params;
  const forceKick = req.query.forceKick === 'true' || req.body?.forceKick === true;

  const users = db.get('users');
  const user = users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
  }

  // CHECK ASSIGNED CLASS RULE:
  // Chỉ cho phép xóa khi tài khoản chưa được gán vào lớp học (hoặc kích user ra khỏi lớp rồi xóa tài khoản).
  const classes = db.get('classes');
  const assignedClasses = classes.filter(
    c => c.teacherId === id || (c.studentIds && c.studentIds.includes(id))
  );

  if (assignedClasses.length > 0) {
    if (!forceKick) {
      return res.status(400).json({
        success: false,
        code: 'USER_ASSIGNED_TO_CLASS',
        message: `Không thể xóa tài khoản "${user.fullname}" vì đang thuộc về ${assignedClasses.length} lớp học (${assignedClasses.map(c => c.name).join(', ')}). Vui lòng gỡ user ra khỏi lớp trước hoặc sử dụng option ?forceKick=true để hệ thống tự động kích user ra khỏi lớp rồi xóa tài khoản!`,
        assignedClasses: assignedClasses.map(c => ({ id: c.id, name: c.name }))
      });
    }

    // Auto kick user from all assigned classes
    for (const cls of classes) {
      if (cls.teacherId === id) {
        cls.teacherId = ''; // gỡ giáo viên
      }
      if (cls.studentIds && cls.studentIds.includes(id)) {
        cls.studentIds = cls.studentIds.filter(sId => sId !== id); // gỡ học viên
      }
    }
    db.update('classes', classes);
  }

  const newUsers = users.filter(u => u.id !== id);
  db.update('users', newUsers);

  return res.status(200).json({
    success: true,
    message: assignedClasses.length > 0
      ? `Đã tự động kích tài khoản "${user.fullname}" ra khỏi ${assignedClasses.length} lớp học và xóa tài khoản thành công!`
      : `Xóa tài khoản "${user.fullname}" thành công!`
  });
};

