import { Router } from 'express';
import {
  getSessions,
  getSessionExercise,
  assignSessionExercise,
  getSessionSubmissions,
  getSubmissionById,
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
 *     summary: Xem danh sách buổi học của lớp (Trả về Tiêu đề buổi, Hạn nộp, Trạng thái đã gán bài tập isAssigned, Số hv nộp bài, Số tin nhắn tự học)
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
 *     description: |
 *       - Nếu buổi học chưa được giáo viên gán bài tập cho lớp: Trả về `isAssigned: false` kèm thông báo *"Buổi học này chưa được giáo viên giao bài tập."*
 *       - Nếu buổi học đã được gán bài tập: Trả về `isAssigned: true` kèm toàn bộ nội dung đề bài tập `exerciseGroup` để học viên làm bài.
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
 *         description: Trả về đề bài 5 dạng (hoặc thông báo chưa giao bài), cảnh báo AI và trạng thái làm bài cá nhân/toàn lớp.
 */
router.get('/:sessionId/exercise', getSessionExercise);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/assign-exercise:
 *   put:
 *     summary: Giáo viên / Admin gán bài tập cho buổi học của lớp sau khi dạy xong
 *     description: |
 *       - Giáo viên dạy xong buổi nào thì tiến hành gán bài tập cho buổi đó của lớp mình phụ trách.
 *       - Khi chưa gán, học viên vào xem sẽ nhận thông báo "Buổi học này chưa được giáo viên giao bài tập" và không thể nộp bài.
 *       - Khi đã gán, toàn bộ học viên trong lớp mới có thể xem đề bài và làm bài tập.
 *       - Có thể chọn nhóm bài tập từ kho bài tập (`exerciseGroupId`) hoặc để trống để hệ thống tự lấy bài tập cấu hình mặc định của khóa học.
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *         example: cls-ielts-01
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exerciseGroupId:
 *                 type: string
 *                 description: ID nhóm bài tập từ kho bài tập (nếu không truyền sẽ tự lấy bài tập mặc định của khóa học)
 *                 example: ex-group-2
 *               deadline:
 *                 type: string
 *                 format: date
 *                 description: Hạn nộp bài (YYYY-MM-DD), mặc định 7 ngày kể từ lúc gán bài
 *                 example: 2026-09-30
 *     responses:
 *       200:
 *         description: Gán bài tập cho buổi học thành công.
 *       400:
 *         description: Nhóm bài tập không tồn tại hoặc chưa chọn bài tập.
 *       403:
 *         description: Bạn không phải giáo viên phụ trách lớp học này.
 *       404:
 *         description: Lớp học không tồn tại.
 */
router.put(
  '/:sessionId/assign-exercise',
  requireRoles('TEACHER', 'ADMIN'),
  assignSessionExercise
);

router.post(
  '/:sessionId/assign-exercise',
  requireRoles('TEACHER', 'ADMIN'),
  assignSessionExercise
);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/submit:
 *   post:
 *     summary: Tab 1 - Nộp bài tập (Học viên) - Hỗ trợ Trắc nghiệm, Tự luận, Điền từ, Listening, Speaking
 *     description: |
 *       - Hỗ trợ gửi body dạng Object `{ answers: [...], audioBlobUrl: "..." }` hoặc gửi trực tiếp mảng `[ ... ]`.
 *       - Trong mỗi câu trả lời, chấp nhận cả `answer` hoặc `studentAnswer`.
 *       - Có thể truyền kèm `sectionId` để phân định chính xác câu hỏi giữa các phần.
 *       - Đối với câu hỏi Speaking, có thể gửi link audio trong `studentAnswer` hoặc qua `audioBlobUrl`.
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
 *                     sectionId:
 *                       type: string
 *                       example: sec-1
 *                     questionId:
 *                       type: string
 *                       example: q-mc-1
 *                     studentAnswer:
 *                       type: string
 *                       example: B. She has finished her assignment already.
 *                     answer:
 *                       type: string
 *                       example: B. She has finished her assignment already.
 *                     type:
 *                       type: string
 *                       example: multiple_choice
 *                 example:
 *                   - sectionId: "sec-1788247761592-1"
 *                     questionId: "38d8182f-d06a-4d39-9fd6-acc4fcf83a88"
 *                     studentAnswer: ["qw", "qwe"]
 *                     type: "fill_blank"
 *                   - sectionId: "sec-1788247761592-2"
 *                     questionId: "q-1788247761592-0"
 *                     studentAnswer: "https://www.google.com/?zx=1789977230677"
 *                     type: "speaking"
 *                   - sectionId: "sec-1788247761592-3"
 *                     questionId: "q-1788247761592-0"
 *                     studentAnswer: "Bài viết tự luận mẫu..."
 *                     type: "essay"
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
 *         description: "Trả về danh sách bài nộp của cả lớp cho buổi học. Mỗi bài nộp có gradingStatus ('graded' | 'pending') và gradingStatusText ('Graded' | 'Pending')."
 */
router.get(
  '/:sessionId/submissions',
  requireRoles('TEACHER', 'ADMIN'),
  getSessionSubmissions
);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/submissions/{submissionId}:
 *   get:
 *     summary: Xem chi tiết bài nộp của học viên (Kèm câu hỏi, đáp án đúng, giải thích và câu trả lời của học viên trong từng câu)
 *     description: |
 *       - Giáo viên / Admin: Xem chi tiết để chấm bài trong popup "Chấm Bài".
 *       - Học viên: Xem lại bài làm của mình sau khi giáo viên chấm xong.
 *       - Cấu trúc `sections`: Chứa danh sách câu hỏi với `studentAnswer`, `userAnswer`, `isCorrect`, `correctAnswer`, và `explanation`.
 *     tags: [Sessions & Lesson Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *         example: cls-ielts-01
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         example: sub-1
 *     responses:
 *       200:
 *         description: Trả về chi tiết bài nộp đã gộp format đề bài và câu trả lời của học viên.
 *       403:
 *         description: Học viên không có quyền xem bài làm của người khác.
 *       404:
 *         description: Bài nộp không tồn tại.
 */
router.get(
  '/:sessionId/submissions/:submissionId',
  getSubmissionById
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

router.put(
  '/:sessionId/submissions/:submissionId/grade',
  requireRoles('TEACHER', 'ADMIN'),
  gradeSubmission
);

/**
 * @swagger
 * /api/v1/classes/{classId}/sessions/{sessionId}/self-study:
 *   get:
 *     summary: Tab 2 - Xem nội dung Tự học (Self-study)
 *     description: Trả về thông tin buổi tự học kèm title và teacherName (tên giáo viên/người đăng). Lưu ý danh sách viewers chỉ trả về cho role TEACHER và ADMIN (role STUDENT không bao gồm viewers).
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
 *               title:
 *                 type: string
 *                 example: "Tài liệu Tự học Buổi 1: IELTS Grammar & Vocab Essentials"
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
router.put('/:sessionId/self-study', requireRoles('TEACHER', 'ADMIN'), updateSelfStudy);

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
