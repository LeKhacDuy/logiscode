import { Router } from 'express';
import { getExercises, createExercise, updateExercise, deleteExercise } from '../controllers/exercise.controller';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

// Require ADMIN or TEACHER for Exercise Management
router.use(authenticateToken, requireRoles('ADMIN', 'TEACHER'));

/**
 * @swagger
 * /api/v1/exercises:
 *   get:
 *     summary: Xem danh sách các nhóm bài tập (Search, Filter status, Pagination) - Admin & Giáo viên
 *     tags: [Exercises Builder Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm tên nhóm bài tập
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Lọc trạng thái nhóm bài tập
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
 *         description: Danh sách nhóm bài tập.
 */
router.get('/', getExercises);

/**
 * @swagger
 * /api/v1/exercises:
 *   post:
 *     summary: Thêm nhóm bài tập mới (Tạo Section & 5 dạng bài: Trắc nghiệm, Tự luận, Điền từ, Listening, Speaking)
 *     tags: [Exercises Builder Management]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nhóm bài tập Buổi 3: Listening & Speaking Mastery
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: sec-1
 *                     title:
 *                       type: string
 *                       example: Phần 1: Listening & Speaking
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: q-spk-1
 *                           type:
 *                             type: string
 *                             enum: [multiple_choice, essay, fill_blank, listening, speaking]
 *                             example: speaking
 *                           prompt:
 *                             type: string
 *                             example: Hãy thu âm đoạn phát biểu giới thiệu sở thích bản thân.
 *                           explanation:
 *                             type: string
 *                             example: Đánh giá ngữ điệu và phát âm chuẩn.
 *     responses:
 *       201:
 *         description: Tạo bài tập thành công.
 */
router.post('/', createExercise);

/**
 * @swagger
 * /api/v1/exercises/{id}:
 *   put:
 *     summary: Sửa nội dung câu hỏi/câu trả lời nhóm bài tập
 *     tags: [Exercises Builder Management]
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
 *                 example: Nhóm bài tập Buổi 3 Cập nhật
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Cập nhật bài tập thành công.
 */
router.put('/:id', updateExercise);

/**
 * @swagger
 * /api/v1/exercises/{id}:
 *   delete:
 *     summary: Xóa nhóm bài tập (Chỉ xóa khi bài tập chưa gán với khóa học nào)
 *     tags: [Exercises Builder Management]
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
 *         description: Xóa nhóm bài tập thành công.
 *       400:
 *         description: Từ chối xóa vì bài tập đang được dùng bởi khóa học.
 */
router.delete('/:id', deleteExercise);

export default router;
