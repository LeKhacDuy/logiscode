import { Router } from 'express';
import { getExercises, getExerciseById, createExercise, updateExercise, deleteExercise } from '../controllers/exercise.controller';
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
 *   post:
 *     summary: Thêm nhóm bài tập mới (Mỗi section có passage và audioUrl optional, câu hỏi gồm 4 dạng multiple_choice, essay, fill_blank nhiều đáp án, speaking)
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
 *                 example: 'Nhóm bài tập Buổi 1: IELTS Foundation Mastery'
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
 *                       example: 'Section 1: Listening & Trắc nghiệm'
 *                     passage:
 *                       type: string
 *                       description: Đoạn văn đọc hiểu hoặc ngữ cảnh của Section (Optional - không bắt buộc)
 *                       example: 'Đoạn văn đọc hiểu hoặc hướng dẫn làm bài...'
 *                     audioUrl:
 *                       type: string
 *                       description: Link file nghe cho cả Section (Optional - dành cho Section Luyện nghe)
 *                       example: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - type
 *                           - prompt
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: q-1
 *                           type:
 *                             type: string
 *                             enum: [multiple_choice, essay, fill_blank, speaking]
 *                             example: fill_blank
 *                           prompt:
 *                             type: string
 *                             example: 'Water boils at [___] degrees Celsius.'
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ['A. 90', 'B. 100', 'C. 110', 'D. 120']
 *                           correctAnswer:
 *                             description: Chuỗi hoặc mảng nhiều đáp án chấp nhận được cho fill_blank
 *                             example: ['100', 'one hundred', '100 degrees']
 *                           explanation:
 *                             type: string
 *                             example: 'Nhiệt độ sôi của nước ở áp suất tiêu chuẩn là 100°C.'
 *     responses:
 *       201:
 *         description: Tạo bài tập thành công.
 */
router.get('/', getExercises);
router.post('/', createExercise);

/**
 * @swagger
 * /api/v1/exercises/{id}:
 *   get:
 *     summary: Xem chi tiết 1 nhóm bài tập theo ID (Sections, 4 loại câu hỏi, options, audioUrl của Section) - Admin & Giáo viên
 *     tags: [Exercises Builder Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: ex-group-1
 *     responses:
 *       200:
 *         description: Trả về chi tiết nhóm bài tập bao gồm sections và các dạng câu hỏi.
 *       404:
 *         description: Nhóm bài tập không tồn tại.
 *   put:
 *     summary: Sửa nhóm bài tập (Sửa section passage, section audioUrl, câu hỏi, đáp án đúng correctAnswer nhiều giá trị)
 *     tags: [Exercises Builder Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: ex-group-1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Nhóm bài tập Buổi 1: Đã Cập Nhật Nội Dung & Đáp Án Mới'
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
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
 *                       example: 'Phần 1: Luyện nghe & Điền từ cập nhật'
 *                     passage:
 *                       type: string
 *                       example: 'Đoạn văn đọc hiểu cập nhật mới...'
 *                     audioUrl:
 *                       type: string
 *                       example: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: q-fb-1
 *                           type:
 *                             type: string
 *                             enum: [multiple_choice, essay, fill_blank, speaking]
 *                             example: fill_blank
 *                           prompt:
 *                             type: string
 *                             example: 'He has been studying here [___] 2020.'
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ['A. since', 'B. for']
 *                           correctAnswer:
 *                             example: ['since', 'from', 'since then']
 *                           explanation:
 *                             type: string
 *                             example: 'Giải thích câu đúng mới...'
 *     responses:
 *       200:
 *         description: Cập nhật bài tập thành công.
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
 *         example: ex-group-1
 *     responses:
 *       200:
 *         description: Xóa nhóm bài tập thành công.
 *       400:
 *         description: Không thể xóa vì bài tập đang được gán cho khóa học.
 */
router.get('/:id', getExerciseById);
router.put('/:id', updateExercise);
router.delete('/:id', deleteExercise);

export default router;
