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

  const allClasses = db.get('classes');
  const courses = db.get('courses');
  const users = db.get('users');
  const submissions = db.get('submissions');

  let filteredClasses = allClasses;

  if (user.role === 'ADMIN') {
    // ADMIN view all classes with search and status filter
    if (search) {
      filteredClasses = filteredClasses.filter(c => c.name.toLowerCase().includes(search));
    }
    if (status) {
      filteredClasses = filteredClasses.filter(c => c.status === status);
    }
  } else if (user.role === 'TEACHER') {
    // TEACHER view only assigned classes
    filteredClasses = filteredClasses.filter(c => c.teacherId === user.id);
  } else if (user.role === 'STUDENT') {
    // STUDENT view only enrolled classes
    filteredClasses = filteredClasses.filter(c => c.studentIds && c.studentIds.includes(user.id));
  }

  // Calculate detailed info (Course name, Teacher name, Student count, Progress %)
  const enrichedClasses = filteredClasses.map(cls => {
    const course = courses.find(c => c.id === cls.courseId);
    const teacher = users.find(u => u.id === cls.teacherId);
    const totalCourseSessions = course ? course.totalSessions : 12;

    // Calculate completed sessions / progress
    // Count max session number submitted in this class
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
