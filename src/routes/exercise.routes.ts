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
 *     summary: Thêm nhóm bài tập mới (Tạo Section & 5 dạng bài Trắc nghiệm, Tự luận, Điền từ, Listening, Speaking, trường passage optional)
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
 *                 example: 'Nhóm bài tập Buổi 1: IELTS Reading & Listening Mastery'
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
 *                       example: 'Phần 1: Reading Comprehension & Trắc nghiệm'
 *                     passage:
 *                       type: string
 *                       description: Đoạn văn đọc hiểu hoặc ngữ cảnh bài tập (Optional - không bắt buộc)
 *                       example: 'Professors and other professionals will not outsource language awareness to software, though. If the technology matures into seamless speech translation, it will actually add value to language skills...'
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
 *                             example: q-mc-1
 *                           type:
 *                             type: string
 *                             enum: [multiple_choice, essay, fill_blank, listening, speaking]
 *                             example: multiple_choice
 *                           prompt:
 *                             type: string
 *                             example: 'What does the reader learn about the conversation in the first paragraph?'
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ['A. Option 1', 'B. Option 2', 'C. Option 3', 'D. Option 4']
 *                           correctAnswer:
 *                             type: string
 *                             example: 'A. Option 1'
 *                           explanation:
 *                             type: string
 *                             example: 'Đoạn 1 nêu rõ về rào cản ngôn ngữ.'
 *                           audioUrl:
 *                             type: string
 *                             example: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
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
 *     summary: Xem chi tiết 1 nhóm bài tập theo ID (Sections, 5 loại câu hỏi, options, audioUrl) - Admin & Giáo viên
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
 *     summary: Sửa nhóm bài tập (Sửa câu hỏi, sửa phương án, sửa đáp án đúng correctAnswer, sửa đoạn văn passage)
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
 *                       example: 'Phần 1: Trắc nghiệm cập nhật'
 *                     passage:
 *                       type: string
 *                       example: 'Đoạn văn đọc hiểu cập nhật mới...'
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: q-mc-1
 *                           type:
 *                             type: string
 *                             enum: [multiple_choice, essay, fill_blank, listening, speaking]
 *                             example: multiple_choice
 *                           prompt:
 *                             type: string
 *                             example: 'Nội dung câu hỏi mới đã sửa'
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ['A. Đáp án 1', 'B. Đáp án 2']
 *                           correctAnswer:
 *                             type: string
 *                             example: 'B. Đáp án 2'
 *                           explanation:
 *                             type: string
 *                             example: 'Giải thích câu đúng mới...'
 *                           audioUrl:
 *                             type: string
 *                             example: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
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
