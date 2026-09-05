import { Response } from 'express';
import { db } from '../data/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Class, ClassStatus } from '../types';

export const getClasses = (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const status = (req.query.status as ClassStatus) || undefined;
  const userSearch = ((req.query.userSearch as string) || '').toLowerCase().trim();
  const teacherSearch = ((req.query.teacherSearch as string) || '').toLowerCase().trim();
  const studentSearch = ((req.query.studentSearch as string) || '').toLowerCase().trim();

  const allClasses = db.get('classes');
  const courses = db.get('courses');
  const users = db.get('users');
  const submissions = db.get('submissions');

  // Map users for fast O(1) lookup
  const userMap = new Map<string, any>();
  users.forEach(u => userMap.set(u.id, u));

  // 1. Phân quyền truy cập theo Role (Scope Filter):
  let scopedClasses = allClasses;
  if (user.role === 'TEACHER') {
    // TEACHER: chỉ xem các lớp được phân công phụ trách
    scopedClasses = scopedClasses.filter(c => c.teacherId === user.id);
  } else if (user.role === 'STUDENT') {
    // STUDENT: chỉ xem các lớp mình tham gia
    scopedClasses = scopedClasses.filter(c => c.studentIds && c.studentIds.includes(user.id));
  }
  // ADMIN: xem được toàn bộ các lớp học

  // 2. Lọc theo Trạng thái lớp (Áp dụng cho CẢ ADMIN, GV và HV):
  if (status) {
    scopedClasses = scopedClasses.filter(c => c.status === status);
  }

  // 3. Tìm kiếm linh hoạt (Search) - Áp dụng cho CẢ ADMIN, GV VÀ HV:
  // - Tìm kiếm theo tên lớp, tên khóa học
  // - Tìm kiếm theo Tên hoặc Email của GV / HV thuộc lớp đó
  const filteredClasses = scopedClasses.filter(cls => {
    const course = courses.find(c => c.id === cls.courseId);
    const teacher = userMap.get(cls.teacherId);
    const classStudents = (cls.studentIds || []).map(id => userMap.get(id)).filter(Boolean);

    // 3a. Tìm kiếm chung (param `search`):
    if (search) {
      const matchClassName = cls.name.toLowerCase().includes(search);
      const matchCourseName = course ? course.name.toLowerCase().includes(search) : false;
      const matchTeacherName = teacher ? teacher.fullname.toLowerCase().includes(search) : false;
      const matchTeacherEmail = teacher ? teacher.email.toLowerCase().includes(search) : false;
      const matchStudent = classStudents.some(s =>
        s.fullname.toLowerCase().includes(search) || s.email.toLowerCase().includes(search)
      );

      if (!matchClassName && !matchCourseName && !matchTeacherName && !matchTeacherEmail && !matchStudent) {
        return false;
      }
    }

    // 3b. Tìm kiếm theo Giáo viên hoặc Học viên thuộc lớp (param `userSearch`):
    if (userSearch) {
      const matchTeacher = teacher && (
        teacher.fullname.toLowerCase().includes(userSearch) ||
        teacher.email.toLowerCase().includes(userSearch)
      );
      const matchStudent = classStudents.some(s =>
        s.fullname.toLowerCase().includes(userSearch) ||
        s.email.toLowerCase().includes(userSearch)
      );

      if (!matchTeacher && !matchStudent) {
        return false;
      }
    }

    // 3c. Tìm kiếm chuyên biệt Giáo viên (param `teacherSearch`):
    if (teacherSearch) {
      const matchTeacher = teacher && (
        teacher.fullname.toLowerCase().includes(teacherSearch) ||
        teacher.email.toLowerCase().includes(teacherSearch)
      );
      if (!matchTeacher) return false;
    }

    // 3d. Tìm kiếm chuyên biệt Học viên (param `studentSearch`):
    if (studentSearch) {
      const matchStudent = classStudents.some(s =>
        s.fullname.toLowerCase().includes(studentSearch) ||
        s.email.toLowerCase().includes(studentSearch)
      );
      if (!matchStudent) return false;
    }

    return true;
  });

  // 4. Bổ sung thông tin chi tiết (Khóa học, Giáo viên, Danh sách học viên, Tiến độ %)
  const enrichedClasses = filteredClasses.map(cls => {
    const course = courses.find(c => c.id === cls.courseId);
    const teacher = userMap.get(cls.teacherId);
    const classStudents = (cls.studentIds || []).map(id => userMap.get(id)).filter(Boolean);
    const totalCourseSessions = course ? course.totalSessions : 12;

    // Tính số buổi đã hoàn thành / tiến độ lớp
    const classSubmissions = submissions.filter(s => s.classId === cls.id);
    const completedSessions = new Set(classSubmissions.map(s => s.sessionId)).size;
    const progressPercent = Math.round((completedSessions / totalCourseSessions) * 100);

    return {
      ...cls,
      courseName: course ? course.name : 'Unknown Course',
      courseLevel: course ? course.level : 'foundation',
      teacherName: teacher ? teacher.fullname : 'Chưa phân công',
      teacherEmail: teacher ? teacher.email : '',
      studentCount: cls.studentIds ? cls.studentIds.length : 0,
      students: classStudents.map(s => ({
        id: s.id,
        fullname: s.fullname,
        email: s.email,
        status: s.status
      })),
      totalSessions: totalCourseSessions,
      completedSessions,
      progressText: `${completedSessions}/${totalCourseSessions} buổi`,
      progressPercent
    };
  });

  const total = enrichedClasses.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedData = enrichedClasses.slice(startIndex, startIndex + limit);

  return res.status(200).json({
    success: true,
    total,
    page,
    limit,
    totalPages,
    data: paginatedData
  });
};

export const createClass = (req: AuthenticatedRequest, res: Response) => {
  const { name, courseId, status = 'schedule', teacherId, studentIds = [] } = req.body;

  if (!name || !courseId || !teacherId) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập tên lớp, chọn khóa học và gán giáo viên.'
    });
  }

  const courses = db.get('courses');
  const courseExists = courses.find(c => c.id === courseId);
  if (!courseExists) {
    return res.status(400).json({ success: false, message: 'Khóa học được chọn không tồn tại.' });
  }

  const users = db.get('users');
  const teacher = users.find(u => u.id === teacherId && u.role === 'TEACHER');
  if (!teacher) {
    return res.status(400).json({ success: false, message: 'Giáo viên được chọn không hợp lệ.' });
  }

  const newClass: Class = {
    id: `cls-${Date.now()}`,
    name: name.trim(),
    courseId,
    status: (['schedule', 'ongoing', 'ended'].includes(status) ? status : 'schedule') as ClassStatus,
    teacherId,
    studentIds: Array.isArray(studentIds) ? studentIds : [],
    createdAt: new Date().toISOString()
  };

  const classes = db.get('classes');
  classes.push(newClass);
  db.update('classes', classes);

  return res.status(201).json({
    success: true,
    message: 'Tạo lớp học mới thành công!',
    data: newClass
  });
};

export const updateClass = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, studentIds, teacherId, name } = req.body;
  const user = req.user!;

  const classes = db.get('classes');
  const classIndex = classes.findIndex(c => c.id === id);

  if (classIndex === -1) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  const cls = classes[classIndex];

  // GV is only allowed to update status for assigned class
  if (user.role === 'TEACHER') {
    if (cls.teacherId !== user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không phải là giáo viên của lớp học này.' });
    }
    if (status) {
      if (!['schedule', 'ongoing', 'ended'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
      }
      cls.status = status;
    }
  } else if (user.role === 'ADMIN') {
    if (name) cls.name = name.trim();
    if (status) cls.status = status;
    if (teacherId) cls.teacherId = teacherId;
    if (studentIds && Array.isArray(studentIds)) cls.studentIds = studentIds;
  }

  classes[classIndex] = cls;
  db.update('classes', classes);

  return res.status(200).json({
    success: true,
    message: 'Cập nhật lớp học thành công!',
    data: cls
  });
};

export const deleteClass = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const classes = db.get('classes');
  const clsIndex = classes.findIndex(c => c.id === id);

  if (clsIndex === -1) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  classes.splice(clsIndex, 1);
  db.update('classes', classes);

  return res.status(200).json({
    success: true,
    message: 'Xóa lớp học thành công!'
  });
};
