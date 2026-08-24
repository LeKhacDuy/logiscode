import { Request, Response } from 'express';
import { db } from '../data/db';
import { ExerciseGroup, ExerciseStatus } from '../types';

export const getExercises = (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const status = (req.query.status as ExerciseStatus) || undefined;

  let exercises = db.get('exercises');

  if (search) {
    exercises = exercises.filter(ex => ex.name.toLowerCase().includes(search));
  }

  if (status) {
    exercises = exercises.filter(ex => ex.status === status);
  }

  const total = exercises.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedData = exercises.slice(startIndex, startIndex + limit);

  return res.status(200).json({
    success: true,
    total,
    page,
    limit,
    totalPages,
    data: paginatedData
  });
};

export const getExerciseById = (req: Request, res: Response) => {
  const { id } = req.params;
  const exercises = db.get('exercises');
  const exercise = exercises.find(ex => ex.id === id);

  if (!exercise) {
    return res.status(404).json({ success: false, message: 'Nhóm bài tập không tồn tại.' });
  }

  return res.status(200).json({
    success: true,
    data: exercise
  });
};


export const createExercise = (req: Request, res: Response) => {
  const { name, status = 'active', sections = [] } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên nhóm bài tập.' });
  }

  const newExercise: ExerciseGroup = {
    id: `ex-group-${Date.now()}`,
    name: name.trim(),
    status: status === 'inactive' ? 'inactive' : 'active',
    sections: Array.isArray(sections)
      ? sections.map((sec, secIdx) => ({
          id: sec.id || `sec-${Date.now()}-${secIdx}`,
          title: sec.title || '',
          passage: sec.passage !== undefined ? sec.passage : (sec.content !== undefined ? sec.content : undefined), // Trường nhập đoạn văn (optional)
          questions: (sec.questions || []).map((q: any, qIdx: number) => ({
            id: q.id || `q-${Date.now()}-${qIdx}`,
            type: q.type || 'multiple_choice',
            prompt: q.prompt !== undefined ? q.prompt : '',
            options: Array.isArray(q.options) ? q.options : undefined,
            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : undefined,
            explanation: q.explanation !== undefined ? q.explanation : undefined,
            audioUrl: q.audioUrl !== undefined ? q.audioUrl : undefined
          }))
        }))
      : [],
    createdAt: new Date().toISOString()
  };

  const exercises = db.get('exercises');
  exercises.push(newExercise);
  db.update('exercises', exercises);

  return res.status(201).json({
    success: true,
    message: 'Tạo nhóm bài tập mới thành công!',
    data: newExercise
  });
};

export const updateExercise = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, status, sections } = req.body;

  const exercises = db.get('exercises');
  const index = exercises.findIndex(ex => ex.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Nhóm bài tập không tồn tại.' });
  }

  // 1. Lưu lại bản sao bài tập cũ (Old Snapshot)
  const currentOldExercise = JSON.parse(JSON.stringify(exercises[index]));

  // 2. Tự động đóng băng bản snapshot bài tập cũ cho tất cả các lớp đã qua buổi học đó (đã nộp bài/đã chấm)
  // để lịch sử bài làm và điểm số của lớp cũ không bao giờ bị ảnh hưởng!
  const submissions = db.get('submissions');
  const courses = db.get('courses');
  const classes = db.get('classes');
  const snapshots = db.get('exerciseSnapshots') || {};

  classes.forEach(cls => {
    const course = courses.find(c => c.id === cls.courseId);
    if (!course || !course.sessionExerciseGroupIds) return;

    Object.entries(course.sessionExerciseGroupIds).forEach(([sessionKey, mappedExId]) => {
      if (mappedExId === id) {
        const sessionNum = parseInt(sessionKey);
        const snapshotKey = `${cls.id}_${sessionNum}`;
        const hasSubmissions = submissions.some(s => s.classId === cls.id && s.sessionId === sessionNum);

        if (hasSubmissions && !snapshots[snapshotKey]) {
          snapshots[snapshotKey] = currentOldExercise;
        }
      }
    });
  });

  db.update('exerciseSnapshots', snapshots);

  const exercise = exercises[index];

  if (name) exercise.name = name.trim();
  if (status) exercise.status = status;

  // QUY TẮC: Cho phép cập nhật trường đoạn văn passage (optional), câu hỏi, câu trả lời, đáp án đúng cho các lớp sau / chưa học buổi này
  if (sections && Array.isArray(sections)) {
    exercise.sections = sections.map((sec, secIdx) => ({
      id: sec.id || `sec-${Date.now()}-${secIdx}`,
      title: sec.title || '',
      passage: sec.passage !== undefined ? sec.passage : (sec.content !== undefined ? sec.content : undefined), // Đoạn văn (optional)
      questions: (sec.questions || []).map((q: any, qIdx: number) => ({
        id: q.id || `q-${Date.now()}-${qIdx}`,
        type: q.type || 'multiple_choice',
        prompt: q.prompt !== undefined ? q.prompt : '',
        options: Array.isArray(q.options) ? q.options : undefined,
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : undefined,
        explanation: q.explanation !== undefined ? q.explanation : undefined,
        audioUrl: q.audioUrl !== undefined ? q.audioUrl : undefined
      }))
    }));
  }

  exercises[index] = exercise;
  db.update('exercises', exercises);

  return res.status(200).json({
    success: true,
    message: 'Cập nhật nhóm bài tập thành công! (Thay đổi áp dụng cho các lớp mới/chưa học, các lớp đã học được bảo toàn lịch sử)',
    data: exercise
  });
};





export const deleteExercise = (req: Request, res: Response) => {
  const { id } = req.params;
  const exercises = db.get('exercises');
  const exercise = exercises.find(ex => ex.id === id);

  if (!exercise) {
    return res.status(404).json({ success: false, message: 'Nhóm bài tập không tồn tại.' });
  }

  // CHECK ASSIGNED COURSE RULE:
  // Chỉ xóa được khi bài tập không gán với khóa nào.
  const courses = db.get('courses');
  const isAssigned = courses.some(c => {
    if (!c.sessionExerciseGroupIds) return false;
    return Object.values(c.sessionExerciseGroupIds).includes(id);
  });

  if (isAssigned) {
    return res.status(400).json({
      success: false,
      message: `Không thể xóa nhóm bài tập "${exercise.name}" vì đang được gán cho một hoặc nhiều khóa học!`
    });
  }

  const newExercises = exercises.filter(ex => ex.id !== id);
  db.update('exercises', newExercises);

  return res.status(200).json({
    success: true,
    message: 'Xóa nhóm bài tập thành công!'
  });
};
