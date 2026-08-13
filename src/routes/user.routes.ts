import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

// Require ADMIN for all user endpoints
router.use(authenticateToken, requireRoles('ADMIN'));

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Xem danh sách tài khoản (Search, Filter role/status, Pagination) - Admin Only
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo fullname hoặc email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, TEACHER, STUDENT]
 *         description: Lọc theo vai trò
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, lock]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Trả về danh sách tài khoản được phân trang.
 */
router.get('/', getUsers);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Thêm tài khoản mới (Tự động sinh mật khẩu 6 ký tự) - Admin Only
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullname
 *               - email
 *               - role
 *             properties:
 *               fullname:
 *                 type: string
 *                 example: Nguyễn Văn Mới
 *               email:
 *                 type: string
 *                 example: newuser@edumanage.com
 *               role:
 *                 type: string
 *                 enum: [ADMIN, TEACHER, STUDENT]
 *                 example: STUDENT
 *               status:
 *                 type: string
 *                 enum: [active, lock]
 *                 default: active
 *     responses:
 *       201:
 *         description: Tạo tài khoản thành công. Trả về thông tin user và mật khẩu 6 ký tự được tự động tạo.
 */
router.post('/', createUser);


/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Cập nhật fullname và trạng thái (lock/active) - Admin Only
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *                 example: Nguyễn Văn Cập Nhật
 *               status:
 *                 type: string
 *                 enum: [active, lock]
 *                 example: lock
 *     responses:
 *       200:
 *         description: Cập nhật thành công. Nếu bị khóa, user sẽ bị logout tự động.
 */
router.put('/:id', updateUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Xóa tài khoản (Chỉ cho phép khi chưa gán vào lớp, hoặc kích user ra khỏi lớp rồi xóa với ?forceKick=true) - Admin Only
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: forceKick
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Đặt true để hệ thống tự động kích user ra khỏi tất cả các lớp học rồi thực hiện xóa tài khoản
 *     responses:
 *       200:
 *         description: Xóa tài khoản thành công.
 *       400:
 *         description: Từ chối xóa vì user đang thuộc về lớp học (nếu forceKick=false).
 */
router.delete('/:id', deleteUser);


export default router;
