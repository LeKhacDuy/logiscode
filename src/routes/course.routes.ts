import { Router } from 'express';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  assignSessionExercise,
  deleteCourse
} from '../controllers/course.controller';
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
 *         description: Danh sách khóa học dạng bảng kèm danh sách buổi học.
 *   post:
 *     summary: Thêm khóa học mới (Check trùng tên + level, nhập title và gán bài tập cho từng buổi) - Admin Only
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
 *                 example: 'IELTS Intensive Master'
 *               totalSessions:
 *                 type: integer
 *                 example: 12
 *               level:
 *                 type: string
 *                 enum: [foundation, intermediate, advanced]
 *                 example: intermediate
 *               sessions:
 *                 type: array
 *                 description: 'Danh sách các buổi học kèm tiêu đề và nhóm bài tập đã gán'
 *                 items:
 *                   type: object
 *                   properties:
 *                     sessionNumber:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: 'Buổi 1: Grammar & Vocabulary Basics'
 *                     exerciseGroupId:
 *                       type: string
 *                       example: 'ex-group-1'
 *               sessionTitles:
 *                 type: object
 *                 description: 'Key-value map: số thứ tự buổi -> tiêu đề buổi học (tùy chọn thay thế)'
 *                 example: { "1": "Buổi 1: Grammar & Vocabulary Basics", "2": "Buổi 2: Reading & Listening Skills" }
 *               sessionExerciseGroupIds:
 *                 type: object
 *                 description: 'Key-value map: số thứ tự buổi -> ID nhóm bài tập (tùy chọn thay thế)'
 *                 example: { "1": "ex-group-1", "2": "ex-group-2" }
 *     responses:
 *       201:
 *         description: Tạo khóa học thành công.
 *       400:
 *         description: Trùng tên và level hoặc thiếu tham số.
 */
router.get('/', getCourses);
router.post('/', createCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Xem chi tiết 1 khóa học theo ID (Bao gồm danh sách các buổi học kèm title và bài tập đã gán) - Admin Only
 *     tags: [Courses Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 'c-ielts-found'
 *     responses:
 *       200:
 *         description: Trả về chi tiết khóa học.
 *       404:
 *         description: Khóa học không tồn tại.
 *   put:
 *     summary: Chỉnh sửa khóa học (Sửa tên, số buổi, level, tiêu đề buổi học title và gán bài tập) - Admin Only
 *     tags: [Courses Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 'c-ielts-found'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'IELTS Foundation K102 Master'
 *               totalSessions:
 *                 type: integer
 *                 example: 12
 *               level:
 *                 type: string
 *                 enum: [foundation, intermediate, advanced]
 *                 example: foundation
 *               sessions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     sessionNumber:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: 'Buổi 1: Grammar & Vocabulary Basics'
 *                     exerciseGroupId:
 *                       type: string
 *                       example: 'ex-group-1'
 *               sessionTitles:
 *                 type: object
 *                 example: { "1": "Buổi 1: Grammar & Vocabulary Basics" }
 *               sessionExerciseGroupIds:
 *                 type: object
 *                 example: { "1": "ex-group-1" }
 *     responses:
 *       200:
 *         description: Cập nhật khóa học thành công.
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
 *         example: 'c-biz-english'
 *     responses:
 *       200:
 *         description: Xóa khóa học thành công.
 *       400:
 *         description: Không cho phép xóa vì khóa học đang được dùng bởi lớp học.
 */
router.get('/:id', getCourseById);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

/**
 * @swagger
 * /api/v1/courses/{id}/sessions/{sessionNumber}:
 *   put:
 *     summary: Gán bài tập cho 1 buổi học cụ thể & nhập/sửa title của buổi đó - Admin Only
 *     tags: [Courses Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID khóa học
 *         example: 'c-ielts-found'
 *       - in: path
 *         name: sessionNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Số thứ tự buổi học (1 đến totalSessions)
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tiêu đề của buổi học
 *                 example: 'Buổi 1: Present Perfect & Listening Part 1'
 *               exerciseGroupId:
 *                 type: string
 *                 description: ID nhóm bài tập cần gán cho buổi (hoặc null/rỗng nếu muốn bỏ gán)
 *                 example: 'ex-group-1'
 *     responses:
 *       200:
 *         description: Cập nhật tiêu đề và gán bài tập cho buổi học thành công.
 *       400:
 *         description: Buổi học không hợp lệ.
 *       404:
 *         description: Khóa học hoặc nhóm bài tập không tồn tại.
 */
router.put('/:id/sessions/:sessionNumber', assignSessionExercise);

export default router;
