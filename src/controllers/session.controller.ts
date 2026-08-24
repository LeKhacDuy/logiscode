import { Response } from 'express';
import { db } from '../data/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Submission, SelfStudy } from '../types';

// 1. Get List of Sessions in a Class
export const getSessions = (req: AuthenticatedRequest, res: Response) => {
  const { classId } = req.params;
  const user = req.user!;

  const classes = db.get('classes');
  const cls = classes.find(c => c.id === classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  const courses = db.get('courses');
  const course = courses.find(c => c.id === cls.courseId);
  const totalSessions = course ? course.totalSessions : 12;

  const submissions = db.get('submissions').filter(s => s.classId === classId);
  const selfStudies = db.get('selfStudies').filter(ss => ss.classId === classId);

  const sessionList = [];
  const createdDate = new Date(cls.createdAt);

  for (let i = 1; i <= totalSessions; i++) {
    // Calculate default deadline: 7 days after class creation + (i-1)*7 days
    const deadlineDate = new Date(createdDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const formattedDeadline = deadlineDate.toISOString().split('T')[0];

    const sessionSubmissions = submissions.filter(s => s.sessionId === i);
    const sessionSelfStudy = selfStudies.find(ss => ss.sessionId === i);
    const selfStudyMessageCount = sessionSelfStudy ? 1 : 0;

    if (user.role === 'STUDENT') {
      const studentSub = sessionSubmissions.find(s => s.studentId === user.id);
      sessionList.push({
        sessionId: i,
        title: `Buổi ${i}: Bài học & Thực hành Buổi ${i}`,
        deadline: formattedDeadline,
        selfStudyCount: selfStudyMessageCount,
        hasSubmitted: !!studentSub,
        score: studentSub ? studentSub.score : null,
        isLate: studentSub ? studentSub.isLate : false
      });
    } else {
      // TEACHER & ADMIN view
      sessionList.push({
        sessionId: i,
        title: `Buổi ${i}: Bài học & Thực hành Buổi ${i}`,
        submittedCount: sessionSubmissions.length,
        totalStudents: cls.studentIds ? cls.studentIds.length : 0,
        deadline: formattedDeadline,
        selfStudyCount: selfStudyMessageCount
      });
    }
  }

  return res.status(200).json({
    success: true,
    classId: cls.id,
    className: cls.name,
    totalSessions,
    sessions: sessionList
  });
};

// 2. Get Exercise details for a session (Tab 1)
export const getSessionExercise = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseInt(sessionId);
  const user = req.user!;

  const classes = db.get('classes');
  const cls = classes.find(c => c.id === classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  // BẢO TOÀN LỊCH SỬ BÀI TẬP (SNAPSHOT ISOLATION PATTERN):
  // Nếu lớp này đã có bài nộp ở buổi này -> Sử dụng bản Snapshot bài tập lúc làm bài (không bị đổi khi bài tập gốc bị sửa sau này).
  // Nếu lớp chưa tới buổi này / chưa ai nộp -> Lấy bản cập nhật mới nhất từ kho bài tập.
  const snapshotKey = `${classId}_${sessionNum}`;
  const snapshots = db.get('exerciseSnapshots') || {};
  let exerciseGroup = snapshots[snapshotKey];

  if (!exerciseGroup) {
    const courses = db.get('courses');
    const course = courses.find(c => c.id === cls.courseId);
    const exerciseGroupId = course?.sessionExerciseGroupIds?.[sessionNum] || 'ex-group-1';
    const exercises = db.get('exercises');
    exerciseGroup = exercises.find(ex => ex.id === exerciseGroupId) || exercises[0];
  }

  const submissions = db.get('submissions').filter(s => s.classId === classId && s.sessionId === sessionNum);

  let userSubmission = null;
  if (user.role === 'STUDENT') {
    userSubmission = submissions.find(s => s.studentId === user.id) || null;
  }

  return res.status(200).json({
    success: true,
    classId,
    sessionId: sessionNum,
    aiWarningBanner: '⚠️ CẢNH BÁO NGHIÊM CẤM: Hệ thống phát hiện và nghiêm cấm việc sử dụng công cụ AI (ChatGPT, Claude...) để làm bài tập.',
    exerciseGroup,
    userSubmission,
    allSubmissions: user.role !== 'STUDENT' ? submissions : undefined
  });
};

// 3. Submit Exercise answers (Tab 1 - Student)
export const submitSessionExercise = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseInt(sessionId);
  const { answers, audioBlobUrl } = req.body;
  const user = req.user!;

  if (user.role !== 'STUDENT') {
    return res.status(403).json({ success: false, message: 'Chỉ học viên mới có thể nộp bài tập.' });
  }

  const submissions = db.get('submissions');
  const existingSubIndex = submissions.findIndex(
    s => s.classId === classId && s.sessionId === sessionNum && s.studentId === user.id
  );

  const now = new Date();
  const classes = db.get('classes');
  const cls = classes.find(c => c.id === classId);
  const createdDate = cls ? new Date(cls.createdAt) : new Date();
  const deadlineDate = new Date(createdDate.getTime() + sessionNum * 7 * 24 * 60 * 60 * 1000);
  const isLate = now > deadlineDate;

  // LƯU / ĐÓNG BĂNG BẢN SNAPSHOT BÀI TẬP TẠI THỜI ĐIỂM LỚP HỌC LÀM BÀI:
  const snapshotKey = `${classId}_${sessionNum}`;
  const snapshots = db.get('exerciseSnapshots') || {};
  let exerciseGroup = snapshots[snapshotKey];

  if (!exerciseGroup) {
    const courses = db.get('courses');
    const course = courses.find(c => c.id === cls?.courseId);
    const exerciseGroupId = course?.sessionExerciseGroupIds?.[sessionNum] || 'ex-group-1';
    const exercises = db.get('exercises');
    const currentMasterExercise = exercises.find(ex => ex.id === exerciseGroupId) || exercises[0];

    // Đóng băng snapshot bản bài tập lúc lớp bắt đầu nộp bài
    exerciseGroup = JSON.parse(JSON.stringify(currentMasterExercise));
    snapshots[snapshotKey] = exerciseGroup;
    db.update('exerciseSnapshots', snapshots);
  }


  // Map all questions in the exercise group
  const questionMap = new Map<string, any>();
  let totalObjectiveQuestions = 0;
  if (exerciseGroup && exerciseGroup.sections) {
    exerciseGroup.sections.forEach(sec => {
      sec.questions?.forEach(q => {
        questionMap.set(q.id, q);
        if (['multiple_choice', 'fill_blank', 'listening'].includes(q.type) && q.correctAnswer) {
          totalObjectiveQuestions++;
        }
      });
    });
  }

  // Grade student answers
  let correctCount = 0;
  const gradedAnswers = (answers || []).map((ans: any) => {
    const q = questionMap.get(ans.questionId);
    if (q && q.correctAnswer) {
      const studentAnsStr = String(ans.answer || '').trim().toLowerCase();
      let isCorrect = false;
      if (Array.isArray(q.correctAnswer)) {
        isCorrect = q.correctAnswer.some((ca: string) => String(ca).trim().toLowerCase() === studentAnsStr);
      } else {
        // Also support matching letter like "B" with "B. Hanoi"
        const correctStr = String(q.correctAnswer).trim().toLowerCase();
        isCorrect = studentAnsStr === correctStr || (studentAnsStr.length === 1 && correctStr.startsWith(studentAnsStr));
      }

      if (isCorrect) correctCount++;

      return {
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || ''
      };
    }

    return {
      questionId: ans.questionId,
      answer: ans.answer
    };
  });

  const autoScore = totalObjectiveQuestions > 0 ? Math.round((correctCount / totalObjectiveQuestions) * 100) : undefined;

  const newSubmission: Submission = {
    id: existingSubIndex !== -1 ? submissions[existingSubIndex].id : `sub-${Date.now()}`,
    classId,
    sessionId: sessionNum,
    studentId: user.id,
    answers: gradedAnswers,
    audioBlobUrl: audioBlobUrl || undefined,
    score: existingSubIndex !== -1 && submissions[existingSubIndex].score !== undefined 
      ? submissions[existingSubIndex].score 
      : autoScore,
    autoScore,
    correctCount,
    totalQuestions: answers ? answers.length : 0,
    feedback: existingSubIndex !== -1 ? submissions[existingSubIndex].feedback : undefined,
    isLate,
    submittedAt: now.toISOString()
  };

  if (existingSubIndex !== -1) {
    submissions[existingSubIndex] = newSubmission;
  } else {
    submissions.push(newSubmission);
  }

  db.update('submissions', submissions);

  return res.status(200).json({
    success: true,
    message: isLate 
      ? `Nộp bài thành công (Ghi nhận: Nộp quá hạn)! Điểm trắc nghiệm tự động: ${autoScore !== undefined ? autoScore + '/100' : 'Đang chờ GV chấm'}` 
      : `Nộp bài thành công! Điểm trắc nghiệm tự động: ${autoScore !== undefined ? autoScore + '/100' : 'Đang chờ GV chấm'}`,
    isLate,
    autoScore,
    correctCount,
    totalQuestions: answers ? answers.length : 0,
    data: newSubmission
  });
};


// 3.5 Get all submissions of a session (Teacher & Admin view)
export const getSessionSubmissions = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseInt(sessionId);

  const classes = db.get('classes');
  const cls = classes.find(c => c.id === classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  const users = db.get('users');
  const submissions = db.get('submissions').filter(s => s.classId === classId && s.sessionId === sessionNum);

  const enrichedSubmissions = submissions.map(sub => {
    const student = users.find(u => u.id === sub.studentId);
    return {
      ...sub,
      studentName: student ? student.fullname : 'Học viên',
      studentEmail: student ? student.email : '',
      gradingStatus: sub.score !== undefined ? 'Đã chấm' : 'Chưa chấm'
    };
  });

  return res.status(200).json({
    success: true,
    classId,
    sessionId: sessionNum,
    totalSubmissions: enrichedSubmissions.length,
    data: enrichedSubmissions
  });
};

// 4. Grade Submission (Tab 1 - Teacher mở Popup chấm điểm và nhận xét)
export const gradeSubmission = (req: AuthenticatedRequest, res: Response) => {
  const { submissionId } = req.params;
  const { score, feedback } = req.body;

  if (score === undefined || score < 0 || score > 100) {
    return res.status(400).json({ success: false, message: 'Điểm số phải nằm trong khoảng từ 0 đến 100.' });
  }

  const submissions = db.get('submissions');
  const subIndex = submissions.findIndex(s => s.id === submissionId);

  if (subIndex === -1) {
    return res.status(404).json({ success: false, message: 'Bài nộp không tồn tại.' });
  }

  submissions[subIndex].score = Number(score);
  submissions[subIndex].feedback = feedback || '';

  db.update('submissions', submissions);

  return res.status(200).json({
    success: true,
    message: 'Chấm bài và lưu nhận xét thành công!',
    data: submissions[subIndex]
  });
};


// 5. Get Self-Study content (Tab 2)
export const getSelfStudy = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseInt(sessionId);

  const selfStudies = db.get('selfStudies');
  const selfStudy = selfStudies.find(ss => ss.classId === classId && ss.sessionId === sessionNum);

  return res.status(200).json({
    success: true,
    classId,
    sessionId: sessionNum,
    data: selfStudy || {
      id: null,
      classId,
      sessionId: sessionNum,
      content: 'Chưa có nội dung tự học cho buổi này.',
      videoUrl: '',
      viewedBy: {}
    }
  });
};

// 6. Post / Edit Self-Study content (Tab 2 - Teacher)
export const updateSelfStudy = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseInt(sessionId);
  const { content, videoUrl } = req.body;
  const user = req.user!;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Nội dung tự học không được để trống.' });
  }

  const selfStudies = db.get('selfStudies');
  const index = selfStudies.findIndex(ss => ss.classId === classId && ss.sessionId === sessionNum);

  const updatedSelfStudy: SelfStudy = {
    id: index !== -1 ? selfStudies[index].id : `ss-${Date.now()}`,
    classId,
    sessionId: sessionNum,
    content,
    videoUrl: videoUrl || '',
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
    viewedBy: index !== -1 ? selfStudies[index].viewedBy : {}
  };

  if (index !== -1) {
    selfStudies[index] = updatedSelfStudy;
  } else {
    selfStudies.push(updatedSelfStudy);
  }

  db.update('selfStudies', selfStudies);

  return res.status(200).json({
    success: true,
    message: 'Cập nhật nội dung bài tự học thành công!',
    data: updatedSelfStudy
  });
};

// 7. Auto Record Student View for Self-Study (Tab 2 - Student)
export const recordSelfStudyView = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseInt(sessionId);
  const user = req.user!;

  const selfStudies = db.get('selfStudies');
  const index = selfStudies.findIndex(ss => ss.classId === classId && ss.sessionId === sessionNum);

  if (index !== -1) {
    if (!selfStudies[index].viewedBy) {
      selfStudies[index].viewedBy = {};
    }
    selfStudies[index].viewedBy[user.id] = new Date().toISOString();
    db.update('selfStudies', selfStudies);
  }

  return res.status(200).json({
    success: true,
    message: 'Đã ghi nhận lượt xem bài tự học!'
  });
};

// 8. Get List of Students who Read / Haven't Read Self-Study (Teacher & Admin)
export const getSelfStudyTrackingReport = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseInt(sessionId);

  const classes = db.get('classes');
  const cls = classes.find(c => c.id === classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  const users = db.get('users');
  const selfStudies = db.get('selfStudies');
  const selfStudy = selfStudies.find(ss => ss.classId === classId && ss.sessionId === sessionNum);
  const viewedByMap = selfStudy?.viewedBy || {};

  const classStudents = users.filter(u => cls.studentIds && cls.studentIds.includes(u.id));

  const readList = [];
  const unreadList = [];

  for (const student of classStudents) {
    const viewTime = viewedByMap[student.id];
    if (viewTime) {
      readList.push({
        studentId: student.id,
        fullname: student.fullname,
        email: student.email,
        viewedAt: viewTime
      });
    } else {
      unreadList.push({
        studentId: student.id,
        fullname: student.fullname,
        email: student.email
      });
    }
  }

  return res.status(200).json({
    success: true,
    classId,
    sessionId: sessionNum,
    summary: {
      totalStudents: classStudents.length,
      readCount: readList.length,
      unreadCount: unreadList.length,
      readPercentage: classStudents.length > 0 ? Math.round((readList.length / classStudents.length) * 100) : 0
    },
    readList,
    unreadList
  });
};
