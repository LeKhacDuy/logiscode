import { Router } from 'express';
import {
  getSessions,
  getSessionExercise,
  getSessionSubmissions,
  submitSessionExercise,
  gradeSubmission,
  getSelfStudy,
  updateSelfStudy,
  recordSelfStudyView,
  getSelfStudyTrackingReport
} from '../controllers/session.controller';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

router.use(authenticateToken);


/**
 * @swagger
 * /api/v1/classes/{classId}/sessions:
 *   get:
 *     summary: Xem danh sách buổi học của lớp (Trả về Tiêu đề buổi, Hạn nộp, Số hv nộp bài, Số tin nhắn tự học)
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về danh sách buổi học trong lớp.
 */
router.get('/', getSessions);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/exercise:
 *   get:
 *     summary: Tab 1 - Xem nội dung Bài tập của buổi (Kèm Cảnh báo nghiêm cấm sử dụng AI)
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trả về đề bài 5 dạng, cảnh báo AI và trạng thái làm bài cá nhân/toàn lớp.
 */
router.get('/:sessionId/exercise', getSessionExercise);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/submit:
 *   post:
 *     summary: Tab 1 - Nộp bài tập (Học viên) - Hỗ trợ Trắc nghiệm, Tự luận, Điền từ, Listening, Speaking
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     answer:
 *                       type: string
 *                 example: [{ "questionId": "q-mc-1", "answer": "B. She has finished her assignment already." }, { "questionId": "q-fb-1", "answer": "since" }]
 *               audioBlobUrl:
 *                 type: string
 *                 example: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
 *     responses:
 *       200:
 *         description: Nộp bài thành công (Kiểm tra và báo tag isLate nếu nộp trễ).
 */
router.post('/:sessionId/submit', requireRoles('STUDENT'), submitSessionExercise);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/submissions:
 *   get:
 *     summary: Tab 1 - Xem danh sách bài nộp của toàn lớp (Giáo viên / Admin xem tên học viên, bài làm, file âm thanh, trạng thái chấm)
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trả về danh sách bài nộp của cả lớp cho buổi học.
 */
router.get(
  '/:sessionId/submissions',
  requireRoles('TEACHER', 'ADMIN'),
  getSessionSubmissions
);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/submissions/{submissionId}/grade:
 *   post:
 *     summary: Tab 1 - Mở Popup Chấm bài (Giáo viên nhập điểm 0-100 & nhận xét)

 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               score:
 *                 type: number
 *                 example: 95
 *               feedback:
 *                 type: string
 *                 example: Bài làm rất xuất sắc, âm điệu chuẩn!
 *     responses:
 *       200:
 *         description: Lưu điểm và nhận xét thành công.
 */
router.post(
  '/:sessionId/submissions/:submissionId/grade',
  requireRoles('TEACHER', 'ADMIN'),
  gradeSubmission
);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/self-study:
 *   get:
 *     summary: Tab 2 - Xem nội dung Tự học (Self-study)
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trả về nội dung tự học bài học.
 */
router.get('/:sessionId/self-study', getSelfStudy);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/self-study:
 *   post:
 *     summary: Tab 2 - Đăng / Chỉnh sửa nội dung Tự học - Giáo viên
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "### Bài học tự chọn Buổi 1\nHọc viên đọc trước tài liệu trang 15."
 *               videoUrl:
 *                 type: string
 *                 example: https://www.youtube.com/embed/dQw4w9WgXcQ
 *     responses:
 *       200:
 *         description: Lưu nội dung tự học thành công.
 */
router.post('/:sessionId/self-study', requireRoles('TEACHER', 'ADMIN'), updateSelfStudy);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/self-study/view:
 *   post:
 *     summary: Tab 2 - Tự động ghi nhận Lượt xem nội dung Tự học - Học viên (Read-only view counter)
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ghi nhận thời gian xem bài của Học viên thành công.
 */
router.post('/:sessionId/self-study/view', requireRoles('STUDENT'), recordSelfStudyView);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/self-study/tracking:
 *   get:
 *     summary: Xem báo cáo danh sách Học viên ĐÃ XEM và CHƯA XEM nội dung Self-study của buổi - Giáo viên / Admin
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trả về danh sách chi tiết học viên ĐÃ XEM (kèm thời gian) và CHƯA XEM.
 */
router.get(
  '/:sessionId/self-study/tracking',
  requireRoles('TEACHER', 'ADMIN'),
  getSelfStudyTrackingReport
);

export default router;
