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
 */
router.get('/', getExercises);

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
 */
router.get('/:id', getExerciseById);

/**
 * @swagger
 * /api/v1/exercises:
 *   post:
 *     summary: Thêm nhóm bài tập mới (Hỗ trợ 5 dạng câu hỏi & trường đoạn văn Section passage optional)
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
 *                 example: Nhóm bài tập Buổi 1: Tổng hợp 5 Dạng Bài IELTS Foundation
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
 *                       example: sec-reading-1
 *                     title:
 *                       type: string
 *                       example: Phần 1: Reading Comprehension & Trắc nghiệm
 *                     passage:
 *                       type: string
 *                       description: Đoạn văn đọc hiểu hoặc ngữ cảnh của Section (Không bắt buộc / Optional)
 *                       example: Professors and other professionals will not outsource language awareness to software, though. If the technology matures into seamless speech translation, it will actually add value to language skills...
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
 *                             example: 1. Which sentence uses the present perfect tense correctly?
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["A. She has finished her assignment yesterday.", "B. She has finished her assignment already.", "C. She finishes since 2 hours.", "D. She had finish."]
 *                           correctAnswer:
 *                             type: string
 *                             example: B. She has finished her assignment already.
 *                           explanation:
 *                             type: string
 *                             example: Present perfect dùng have/has + V3 với already.
 *                           audioUrl:
 *                             type: string
 *                             example: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
 *           example:
 *             name: Nhóm bài tập Buổi 1: Đầy đủ 5 dạng bài
 *             status: active
 *             sections:
 *               - id: sec-1
 *                 title: Phần 1: Trắc nghiệm & Điền từ & Tự luận
 *                 passage: Đoạn văn mẫu đọc hiểu (Optional - để trống nếu không dùng)
 *                 questions:
 *                   - id: q-mc-1
 *                     type: multiple_choice
 *                     prompt: Câu 1 (Trắc nghiệm): What is the capital of Vietnam?
 *                     options: ["A. Da Nang", "B. Hanoi", "C. HCMC", "D. Can Tho"]
 *                     correctAnswer: B. Hanoi
 *                     explanation: Hanoi has been the capital since 1976.
 *                   - id: q-fb-1
 *                     type: fill_blank
 *                     prompt: Câu 2 (Điền từ): He has been studying here [___] 2020.
 *                     correctAnswer: since
 *                     explanation: since + mốc thời gian.
 *                   - id: q-ess-1
 *                     type: essay
 *                     prompt: Câu 3 (Tự luận): Write a short paragraph (100 words) about your daily routine.
 *                     explanation: Chấm điểm dựa trên vốn từ và sự mạch lạc.
 *               - id: sec-2
 *                 title: Phần 2: Listening & Speaking
 *                 questions:
 *                   - id: q-lis-1
 *                     type: listening
 *                     prompt: Câu 4 (Listening): Listen to the audio clip and select the correct time:
 *                     audioUrl: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
 *                     options: ["A. 9:00 AM", "B. 10:00 AM"]
 *                     correctAnswer: B. 10:00 AM
 *                     explanation: The audio mentions 10:00 AM.
 *                   - id: q-spk-1
 *                     type: speaking
 *                     prompt: Câu 5 (Speaking): Record your voice introducing yourself (1-2 minutes).
 *                     explanation: Đánh giá phát âm và độ trôi chảy.
 *     responses:
 *       201:
 *         description: Tạo bài tập thành công.
 */
router.post('/', createExercise);

/**
 * @swagger
 * /api/v1/exercises/{id}:
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
 *                 example: Nhóm bài tập Buổi 1: Đã Cập Nhật Nội Dung & Đáp Án Mới
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
 *                       example: Phần 1: Trắc nghiệm cập nhật
 *                     passage:
 *                       type: string
 *                       example: Đoạn văn đọc hiểu cập nhật mới...
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
 *                             example: multiple_choice
 *                           prompt:
 *                             type: string
 *                             example: Nội dung câu hỏi mới đã sửa
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["A. Đáp án 1", "B. Đáp án 2"]
 *                           correctAnswer:
 *                             type: string
 *                             example: B. Đáp án 2
 *                           explanation:
 *                             type: string
 *                             example: Giải thích câu đúng mới...
 *           example:
 *             name: Nhóm bài tập Buổi 1: Đã Cập Nhật Nội Dung
 *             status: active
 *             sections:
 *               - id: sec-1
 *                 title: Phần 1: Trắc nghiệm & Điền từ
 *                 passage: Đoạn văn đọc hiểu cập nhật
 *                 questions:
 *                   - id: q-mc-1
 *                     type: multiple_choice
 *                     prompt: Nội dung câu hỏi đã cập nhật
 *                     options: ["A. Phương án A", "B. Phương án B"]
 *                     correctAnswer: B. Phương án B
 *                     explanation: Giải thích đáp án đúng
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
