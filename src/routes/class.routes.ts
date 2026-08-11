import { Router } from 'express';
import { getClasses, createClass, updateClass, deleteClass } from '../controllers/class.controller';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/classes:
 *   get:
 *     summary: Xem danh sách lớp học (ADMIN xem toàn bộ bảng; GV/HV xem danh sách lớp được gán kèm Tiến độ %)
 *     tags: [Classes Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm tên lớp (Dành cho Admin)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [schedule, ongoing, ended]
 *         description: Lọc trạng thái lớp học
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
 *         description: Trả về danh sách lớp học kèm thông tin Khóa học, Giáo viên, Số học viên và Tiến độ học tập % (vd 12/36 buổi).
 */
router.get('/', getClasses);

/**
 * @swagger
 * /api/v1/classes:
 *   post:
 *     summary: Thêm lớp học mới - Admin Only
 *     tags: [Classes Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - courseId
 *               - teacherId
 *             properties:
 *               name:
 *                 type: string
 *                 example: IELTS Intensive K99
 *               courseId:
 *                 type: string
 *                 example: c-ielts-found
 *               status:
 *                 type: string
 *                 enum: [schedule, ongoing, ended]
 *                 default: schedule
 *               teacherId:
 *                 type: string
 *                 example: u-teacher-1
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["u-student-1", "u-student-2"]
 *     responses:
 *       201:
 *         description: Tạo lớp học thành công.
 */
router.post('/', requireRoles('ADMIN'), createClass);

/**
 * @swagger
 * /api/v1/classes/{id}:
 *   put:
 *     summary: Chỉnh sửa lớp học (Admin sửa thành viên/status; Giáo viên đổi status lớp)
 *     tags: [Classes Management]
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
 *               status:
 *                 type: string
 *                 enum: [schedule, ongoing, ended]
 *                 example: ongoing
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["u-student-1", "u-student-2", "u-student-3"]
 *     responses:
 *       200:
 *         description: Cập nhật thành công.
 */
router.put('/:id', requireRoles('ADMIN', 'TEACHER'), updateClass);

/**
 * @swagger
 * /api/v1/classes/{id}:
 *   delete:
 *     summary: Xóa lớp học - Admin Only
 *     tags: [Classes Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa lớp học thành công.
 */
router.delete('/:id', requireRoles('ADMIN'), deleteClass);

export default router;
