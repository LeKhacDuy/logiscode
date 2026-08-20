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
    sections: Array.isArray(sections) ? sections : [],
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

  const exercise = exercises[index];

  if (name) exercise.name = name.trim();
  if (status) exercise.status = status;

  // QUY TẮC NGHIỆP VỤ:
  // - Chỉ cập nhật được nội dung câu hỏi và câu trả lời đã được tạo (tránh bị ảnh hưởng bởi các khóa đã được gán vào lớp học)
  // - Không được sửa/xoá đáp án đúng (bảo toàn correctAnswer ban đầu).
  if (sections && Array.isArray(sections)) {
    const existingQuestionMap = new Map<string, any>();
    exercise.sections?.forEach(sec => {
      sec.questions?.forEach(q => {
        if (q.id) existingQuestionMap.set(q.id, q);
      });
    });

    exercise.sections = sections.map((sec, secIdx) => ({
      id: sec.id || `sec-${Date.now()}-${secIdx}`,
      title: sec.title || '',
      questions: (sec.questions || []).map((q: any, qIdx: number) => {
        const existingQ = q.id ? existingQuestionMap.get(q.id) : null;
        return {
          id: q.id || `q-${Date.now()}-${qIdx}`,
          type: q.type || existingQ?.type || 'multiple_choice',
          prompt: q.prompt !== undefined ? q.prompt : existingQ?.prompt,
          options: q.options !== undefined ? q.options : existingQ?.options,
          // BẢO TOÀN ĐÁP ÁN ĐÚNG CỦA CÂU HỎI ĐÃ TẠO
          correctAnswer: existingQ ? existingQ.correctAnswer : q.correctAnswer,
          explanation: q.explanation !== undefined ? q.explanation : existingQ?.explanation,
          audioUrl: q.audioUrl !== undefined ? q.audioUrl : existingQ?.audioUrl
        };
      })
    }));
  }

  exercises[index] = exercise;
  db.update('exercises', exercises);

  return res.status(200).json({
    success: true,
    message: 'Cập nhật nhóm bài tập thành công! (Nội dung câu hỏi và câu trả lời đã được cập nhật, đáp án đúng được bảo toàn)',
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
