import { Router } from 'express';
import { getClasses, createClass, updateClass, deleteClass } from '../controllers/class.controller';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/classes:
 *   get:
 *     summary: Xem danh sách lớp học (Hỗ trợ tìm kiếm Tên/Email GV, HV, tên lớp, lọc trạng thái cho ADMIN, GV, HV)
 *     tags: [Classes Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm chung - Tìm theo Tên lớp, Tên khóa học, hoặc Tên/Email của Giáo viên, Học viên thuộc lớp (Áp dụng cho ADMIN, GV, HV)
 *         example: An
 *       - in: query
 *         name: userSearch
 *         schema:
 *           type: string
 *         description: Tìm kiếm lớp học theo Tên hoặc Email của GV / HV thuộc lớp đó
 *         example: gv.an@edumanage.com
 *       - in: query
 *         name: teacherSearch
 *         schema:
 *           type: string
 *         description: Tìm kiếm chuyên biệt theo Tên hoặc Email Giáo viên phụ trách lớp
 *         example: Nguyễn Văn An
 *       - in: query
 *         name: studentSearch
 *         schema:
 *           type: string
 *         description: Tìm kiếm chuyên biệt theo Tên hoặc Email Học viên thuộc lớp
 *         example: hv.binh@edumanage.com
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [schedule, ongoing, ended]
 *         description: Lọc trạng thái lớp học (Áp dụng cho CẢ ADMIN, GV và HV)
 *         example: ongoing
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
 *         description: Trả về danh sách lớp học kèm thông tin Khóa học, Giáo viên, Danh sách học viên và Tiến độ học tập % (vd 1/12 buổi).
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
