import { Request, Response } from 'express';
import { db } from '../data/db';
import { Course, CourseLevel } from '../types';

export const getCourses = (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = ((req.query.search as string) || '').toLowerCase().trim();

  let courses = db.get('courses');

  if (search) {
    courses = courses.filter(c => c.name.toLowerCase().includes(search));
  }

  const total = courses.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedData = courses.slice(startIndex, startIndex + limit);

  return res.status(200).json({
    success: true,
    total,
    page,
    limit,
    totalPages,
    data: paginatedData
  });
};

export const createCourse = (req: Request, res: Response) => {
  const { name, totalSessions, level, sessionExerciseGroupIds = {} } = req.body;

  if (!name || !totalSessions || !level) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập tên khóa học, số buổi học và chọn level (foundation | intermediate | advanced).'
    });
  }

  const validLevels: CourseLevel[] = ['foundation', 'intermediate', 'advanced'];
  if (!validLevels.includes(level)) {
    return res.status(400).json({
      success: false,
      message: 'Level không hợp lệ. Vui lòng chọn foundation, intermediate hoặc advanced.'
    });
  }

  const courses = db.get('courses');
  // CHECK DUPLICATE NAME AND LEVEL RULE:
  // Không cho phép trùng tên và trùng level
  const duplicate = courses.find(
    c => c.name.toLowerCase() === name.toLowerCase().trim() && c.level === level
  );

  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: `Khóa học với tên "${name}" và trình độ "${level}" đã tồn tại trong hệ thống. Vui lòng chọn tên hoặc trình độ khác!`
    });
  }

  const newCourse: Course = {
    id: `c-${Date.now()}`,
    name: name.trim(),
    totalSessions: Number(totalSessions),
    level,
    sessionExerciseGroupIds,
    createdAt: new Date().toISOString()
  };

  courses.push(newCourse);
  db.update('courses', courses);

  return res.status(201).json({
    success: true,
    message: 'Thêm khóa học mới thành công!',
    data: newCourse
  });
};

export const updateCourse = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, totalSessions, level, sessionExerciseGroupIds } = req.body;

  const courses = db.get('courses');
  const courseIndex = courses.findIndex(c => c.id === id);

  if (courseIndex === -1) {
    return res.status(404).json({ success: false, message: 'Khóa học không tồn tại.' });
  }

  const course = courses[courseIndex];

  if (name && level) {
    // Check duplicate with other courses
    const duplicate = courses.find(
      c => c.id !== id && c.name.toLowerCase() === name.toLowerCase().trim() && c.level === level
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Khóa học khác với tên "${name}" và trình độ "${level}" đã tồn tại!`
      });
    }
  }

  if (name) course.name = name.trim();
  if (totalSessions) course.totalSessions = Number(totalSessions);
  if (level) course.level = level;
  if (sessionExerciseGroupIds) course.sessionExerciseGroupIds = sessionExerciseGroupIds;

  courses[courseIndex] = course;
  db.update('courses', courses);

  return res.status(200).json({
    success: true,
    message: 'Cập nhật khóa học thành công!',
    data: course
  });
};

export const deleteCourse = (req: Request, res: Response) => {
  const { id } = req.params;
  const courses = db.get('courses');
  const course = courses.find(c => c.id === id);

  if (!course) {
    return res.status(404).json({ success: false, message: 'Khóa học không tồn tại.' });
  }

  // CHECK ASSIGNED CLASS RULE:
  // Chỉ cho phép xóa khi khóa học chưa được gán vào lớp nào.
  const classes = db.get('classes');
  const assignedClass = classes.find(c => c.courseId === id);

  if (assignedClass) {
    return res.status(400).json({
      success: false,
      message: `Không thể xóa khóa học "${course.name}" vì đang được gán cho lớp học "${assignedClass.name}".`
    });
  }

  const newCourses = courses.filter(c => c.id !== id);
  db.update('courses', newCourses);

  return res.status(200).json({
    success: true,
    message: 'Xóa khóa học thành công!'
  });
};
