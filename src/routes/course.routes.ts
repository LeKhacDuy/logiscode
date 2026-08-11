import { Router } from 'express';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../controllers/course.controller';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

// Require ADMIN for all Course endpoints
router.use(authenticateToken, requireRoles('ADMIN'));

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Xem danh sách khóa học (Search, Pagination) - Admin Only
 *     tags: [Courses Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm tên khóa học
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
 *         description: Danh sách khóa học dạng bảng.
 */
router.get('/', getCourses);

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Thêm khóa học mới (Check trùng tên + level, gán bài tập cho từng buổi) - Admin Only
 *     tags: [Courses Management]
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
 *               - totalSessions
 *               - level
 *             properties:
 *               name:
 *                 type: string
 *                 example: IELTS Intensive Master
 *               totalSessions:
 *                 type: integer
 *                 example: 36
 *               level:
 *                 type: string
 *                 enum: [foundation, intermediate, advanced]
 *                 example: advanced
 *               sessionExerciseGroupIds:
 *                 type: object
 *                 example: { "1": "ex-group-1", "2": "ex-group-2" }
 *     responses:
 *       201:
 *         description: Tạo khóa học thành công.
 *       400:
 *         description: Trùng tên và level hoặc thiếu tham số.
 */
router.post('/', createCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: Chỉnh sửa khóa học / Gán bài tập cho buổi học - Admin Only
 *     tags: [Courses Management]
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
 *               name:
 *                 type: string
 *                 example: IELTS Intensive Master Update
 *               totalSessions:
 *                 type: integer
 *                 example: 36
 *               level:
 *                 type: string
 *                 enum: [foundation, intermediate, advanced]
 *               sessionExerciseGroupIds:
 *                 type: object
 *                 example: { "1": "ex-group-1" }
 *     responses:
 *       200:
 *         description: Cập nhật khóa học thành công.
 */
router.put('/:id', updateCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: Xóa khóa học (Chỉ được xóa khi chưa gán vào lớp nào) - Admin Only
 *     tags: [Courses Management]
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
 *         description: Xóa khóa học thành công.
 *       400:
 *         description: Không cho phép xóa vì khóa học đang được dùng bởi lớp học.
 */
router.delete('/:id', deleteCourse);

export default router;
