import { Request, Response } from 'express';
import { db } from '../data/db';
import { Course, CourseLevel, CourseSession } from '../types';

// Helper để đồng bộ sessions, sessionTitles và sessionExerciseGroupIds
const buildCourseSessions = (
  totalSessions: number,
  sessionsInput?: any[],
  sessionTitlesInput?: Record<string | number, string>,
  sessionExerciseGroupIdsInput?: Record<string | number, string>
) => {
  const sessionExerciseGroupIds: Record<string | number, string> = { ...(sessionExerciseGroupIdsInput || {}) };
  const sessionTitles: Record<string | number, string> = { ...(sessionTitlesInput || {}) };
  let sessions: CourseSession[] = [];

  if (Array.isArray(sessionsInput) && sessionsInput.length > 0) {
    sessions = sessionsInput.map((s: any, idx: number) => {
      const sessionNumber = s.sessionNumber || (idx + 1);
      const title = s.title !== undefined ? String(s.title).trim() : (sessionTitles[sessionNumber] || `Buổi ${sessionNumber}`);
      const exerciseGroupId = s.exerciseGroupId !== undefined ? s.exerciseGroupId : sessionExerciseGroupIds[sessionNumber];

      if (title) sessionTitles[sessionNumber] = title;
      if (exerciseGroupId) {
        sessionExerciseGroupIds[sessionNumber] = exerciseGroupId;
      } else if (exerciseGroupId === null || exerciseGroupId === '') {
        delete sessionExerciseGroupIds[sessionNumber];
      }

      return {
        sessionNumber,
        title,
        exerciseGroupId: exerciseGroupId || undefined
      };
    });
  } else {
    for (let i = 1; i <= totalSessions; i++) {
      const title = sessionTitles[i] || `Buổi ${i}`;
      const exerciseGroupId = sessionExerciseGroupIds[i] || undefined;
      sessions.push({
        sessionNumber: i,
        title,
        exerciseGroupId
      });
    }
  }

  return { sessions, sessionTitles, sessionExerciseGroupIds };
};

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
  const paginatedData = courses.slice(startIndex, startIndex + limit).map(course => {
    const { sessions, sessionTitles, sessionExerciseGroupIds } = buildCourseSessions(
      course.totalSessions,
      course.sessions,
      course.sessionTitles,
      course.sessionExerciseGroupIds
    );
    return {
      ...course,
      sessionTitles,
      sessionExerciseGroupIds,
      sessions
    };
  });

  return res.status(200).json({
    success: true,
    total,
    page,
    limit,
    totalPages,
    data: paginatedData
  });
};

export const getCourseById = (req: Request, res: Response) => {
  const { id } = req.params;
  const courses = db.get('courses');
  const course = courses.find(c => c.id === id);

  if (!course) {
    return res.status(404).json({ success: false, message: 'Khóa học không tồn tại.' });
  }

  const exercises = db.get('exercises');
  const { sessions, sessionTitles, sessionExerciseGroupIds } = buildCourseSessions(
    course.totalSessions,
    course.sessions,
    course.sessionTitles,
    course.sessionExerciseGroupIds
  );

  // Đính kèm thông tin tên nhóm bài tập để frontend hiển thị trực tiếp
  const enrichedSessions = sessions.map(s => {
    const ex = s.exerciseGroupId ? exercises.find(e => e.id === s.exerciseGroupId) : null;
    return {
      ...s,
      exerciseGroupName: ex ? ex.name : null,
      exerciseGroupStatus: ex ? ex.status : null
    };
  });

  return res.status(200).json({
    success: true,
    data: {
      ...course,
      sessionTitles,
      sessionExerciseGroupIds,
      sessions: enrichedSessions
    }
  });
};

export const createCourse = (req: Request, res: Response) => {
  const { name, totalSessions, level, sessionExerciseGroupIds, sessionTitles, sessions } = req.body;

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
  const duplicate = courses.find(
    c => c.name.toLowerCase() === name.toLowerCase().trim() && c.level === level
  );

  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: `Khóa học với tên "${name}" và trình độ "${level}" đã tồn tại trong hệ thống. Vui lòng chọn tên hoặc trình độ khác!`
    });
  }

  const numSessions = Number(totalSessions);
  const syncData = buildCourseSessions(numSessions, sessions, sessionTitles, sessionExerciseGroupIds);

  const newCourse: Course = {
    id: `c-${Date.now()}`,
    name: name.trim(),
    totalSessions: numSessions,
    level,
    sessionTitles: syncData.sessionTitles,
    sessionExerciseGroupIds: syncData.sessionExerciseGroupIds,
    sessions: syncData.sessions,
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
  const { name, totalSessions, level, sessionExerciseGroupIds, sessionTitles, sessions } = req.body;

  const courses = db.get('courses');
  const courseIndex = courses.findIndex(c => c.id === id);

  if (courseIndex === -1) {
    return res.status(404).json({ success: false, message: 'Khóa học không tồn tại.' });
  }

  const course = courses[courseIndex];

  if (name && level) {
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

  const syncData = buildCourseSessions(
    course.totalSessions,
    sessions !== undefined ? sessions : course.sessions,
    sessionTitles !== undefined ? sessionTitles : course.sessionTitles,
    sessionExerciseGroupIds !== undefined ? sessionExerciseGroupIds : course.sessionExerciseGroupIds
  );

  course.sessionTitles = syncData.sessionTitles;
  course.sessionExerciseGroupIds = syncData.sessionExerciseGroupIds;
  course.sessions = syncData.sessions;

  courses[courseIndex] = course;
  db.update('courses', courses);

  return res.status(200).json({
    success: true,
    message: 'Cập nhật khóa học thành công!',
    data: course
  });
};

// Gán bài tập và cập nhật tiêu đề cho 1 buổi học cụ thể trong khóa học
export const assignSessionExercise = (req: Request, res: Response) => {
  const { id, sessionNumber } = req.params;
  const { title, exerciseGroupId } = req.body;
  const sessionNum = parseInt(sessionNumber);

  const courses = db.get('courses');
  const courseIndex = courses.findIndex(c => c.id === id);

  if (courseIndex === -1) {
    return res.status(404).json({ success: false, message: 'Khóa học không tồn tại.' });
  }

  const course = courses[courseIndex];

  if (isNaN(sessionNum) || sessionNum < 1 || sessionNum > course.totalSessions) {
    return res.status(400).json({
      success: false,
      message: `Buổi học không hợp lệ. Khóa học "${course.name}" có từ buổi 1 đến buổi ${course.totalSessions}.`
    });
  }

  // Nếu có gán bài tập, kiểm tra bài tập có tồn tại không
  if (exerciseGroupId) {
    const exercises = db.get('exercises');
    const ex = exercises.find(e => e.id === exerciseGroupId);
    if (!ex) {
      return res.status(404).json({
        success: false,
        message: `Nhóm bài tập với ID "${exerciseGroupId}" không tồn tại.`
      });
    }
  }

  if (!course.sessionTitles) course.sessionTitles = {};
  if (!course.sessionExerciseGroupIds) course.sessionExerciseGroupIds = {};

  if (title !== undefined) {
    course.sessionTitles[sessionNum] = String(title).trim();
  }

  if (exerciseGroupId !== undefined) {
    if (exerciseGroupId === null || exerciseGroupId === '') {
      delete course.sessionExerciseGroupIds[sessionNum];
    } else {
      course.sessionExerciseGroupIds[sessionNum] = exerciseGroupId;
    }
  }

  // Cập nhật lại sessions array
  const syncData = buildCourseSessions(
    course.totalSessions,
    course.sessions,
    course.sessionTitles,
    course.sessionExerciseGroupIds
  );

  course.sessions = syncData.sessions;
  courses[courseIndex] = course;
  db.update('courses', courses);

  const updatedSession = course.sessions.find(s => s.sessionNumber === sessionNum);

  return res.status(200).json({
    success: true,
    message: `Cập nhật tiêu đề và gán bài tập cho Buổi ${sessionNum} thành công!`,
    data: {
      courseId: course.id,
      courseName: course.name,
      session: updatedSession,
      course
    }
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
