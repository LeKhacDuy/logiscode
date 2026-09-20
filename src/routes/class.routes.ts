import { Router } from 'express';
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  lockClassReview
} from '../controllers/class.controller';
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
 * /api/v1/classes/{id}:
 *   get:
 *     summary: Chi tiết lớp học (Class Detail) - Tên lớp, Khóa học, Giáo viên, Tiến độ, Danh sách buổi học & Danh sách học viên
 *     description: |
 *       - **ADMIN**: Xem chi tiết mọi lớp học. Danh sách học viên bao gồm Họ tên, Email và Tiến độ làm bài tập đến buổi nào (vd 3/12 buổi).
 *       - **TEACHER (GV)**: Chỉ xem lớp mình được phân công giảng dạy. Danh sách học viên bao gồm Họ tên, Email và Tiến độ làm bài tập đến buổi nào (vd 3/12 buổi).
 *       - **STUDENT (HV)**: Chỉ xem lớp mình tham gia. Danh sách học viên trong lớp chỉ bao gồm Họ tên và Email.
 *     tags: [Classes Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học (vd cls-ielts-01)
 *         example: cls-ielts-01
 *     responses:
 *       200:
 *         description: Trả về chi tiết lớp học gồm tên lớp, khóa học, giáo viên, student count, progress, lessons list và danh sách học viên theo phân quyền.
 *       403:
 *         description: Không có quyền truy cập thông tin lớp học này.
 *       404:
 *         description: Lớp học không tồn tại.
 */
router.get('/:id', getClassById);

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

/**
 * @swagger
 * /api/v1/classes/{id}/lock-review:
 *   put:
 *     summary: Khóa / Mở khóa quyền xem lại bài cũ đối với học viên của lớp (Admin & GV phụ trách lớp)
 *     description: |
 *       - **ADMIN**: Có quyền khóa hoặc mở khóa quyền xem lại của bất kỳ lớp học nào.
 *       - **TEACHER (Giáo viên)**: Chỉ có quyền khóa/mở khóa đối với lớp mình phụ trách giảng dạy.
 *       - Khi bị khóa, học viên trong lớp sẽ bị chặn **403 Forbidden** khi truy cập xem lại đề bài, đáp án (`/exercise`), tài liệu tự học (`/self-study`), hoặc nộp bài mới (`/submit`).
 *       - API chi tiết lớp (`GET /api/v1/classes/:id`) sẽ trả về cờ `isReviewLocked: true` ở từng buổi học để Frontend hiển thị biểu tượng ổ khóa 🔒.
 *     tags: [Classes Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *         example: cls-ielts-01
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isReviewLocked:
 *                 type: boolean
 *                 description: true để khóa, false để mở khóa lại. Mặc định là true.
 *                 example: true
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: (Tùy chọn) Danh sách học viên cụ thể muốn khóa/mở khóa. Nếu không truyền hoặc rỗng, áp dụng cho toàn bộ học viên của lớp.
 *                 example: ["u-student-1"]
 *               message:
 *                 type: string
 *                 description: (Tùy chọn) Thông báo hiển thị khi học viên bị khóa truy cập xem lại.
 *                 example: Lớp học đã kết thúc và đã bị khóa tính năng xem lại bài cũ.
 *     responses:
 *       200:
 *         description: Khóa/Mở khóa thành công.
 *       403:
 *         description: Không có quyền (chỉ Admin hoặc Giáo viên phụ trách lớp mới được gọi).
 *       404:
 *         description: Lớp học không tồn tại.
 *   post:
 *     summary: Khóa / Mở khóa quyền xem lại bài cũ (Alias POST)
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isReviewLocked:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Thành công.
 */
router.put('/:id/lock-review', requireRoles('ADMIN', 'TEACHER'), lockClassReview);
router.post('/:id/lock-review', requireRoles('ADMIN', 'TEACHER'), lockClassReview);
router.put('/:id/review-lock', requireRoles('ADMIN', 'TEACHER'), lockClassReview);

export default router;
