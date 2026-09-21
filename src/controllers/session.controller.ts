import { Response } from 'express';
import { db } from '../data/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Submission, SelfStudy } from '../types';
import { isStudentReviewLocked } from './class.controller';

// Helper to parse sessionId flexibly (supports 1, "1", "ses-1", "ses-01", etc.)
export const parseSessionId = (sessionId: string | undefined): number => {
  if (!sessionId) return 1;
  const num = parseInt(sessionId, 10);
  if (!isNaN(num)) return num;
  const extracted = parseInt(sessionId.replace(/\D/g, ''), 10);
  return isNaN(extracted) ? 1 : extracted;
};

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

  const studentIsReviewLocked = user.role === 'STUDENT' && isStudentReviewLocked(cls, user.id);
  const sessionList = [];
  const createdDate = new Date(cls.createdAt);

  for (let i = 1; i <= totalSessions; i++) {
    const sessionSubmissions = submissions.filter(s => s.sessionId === i);
    const hasSubmissions = sessionSubmissions.length > 0;
    const isAssigned = !!(cls.sessionExerciseGroupIds?.[i] || hasSubmissions);
    const exerciseGroupId = cls.sessionExerciseGroupIds?.[i] ||
      (hasSubmissions ? (course?.sessionExerciseGroupIds?.[i] || 'ex-group-1') : null);

    // Calculate deadline: Chỉ có deadline khi bài tập ĐÃ ĐƯỢC GÁN cho lớp (isAssigned: true)
    const sessionDeadline = isAssigned
      ? (cls.sessionDeadlines?.[i] || new Date(createdDate.getTime() + i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      : null;
    const sessionSelfStudy = selfStudies.find(ss => ss.sessionId === i);
    const selfStudyMessageCount = sessionSelfStudy ? 1 : 0;

    const sessionTitle = course?.sessionTitles?.[i] ||
      course?.sessions?.find(s => s.sessionNumber === i)?.title ||
      `Buổi ${i}: Bài học & Thực hành Buổi ${i}`;

    if (user.role === 'STUDENT') {
      const studentSub = sessionSubmissions.find(s => s.studentId === user.id);
      sessionList.push({
        sessionId: i,
        title: sessionTitle,
        deadline: sessionDeadline,
        isAssigned,
        isReviewLocked: studentIsReviewLocked,
        exerciseGroupId,
        selfStudyCount: selfStudyMessageCount,
        hasSubmitted: !!studentSub,
        score: studentSub ? studentSub.score : null,
        isLate: studentSub ? studentSub.isLate : false
      });
    } else {
      // TEACHER & ADMIN view
      sessionList.push({
        sessionId: i,
        title: sessionTitle,
        isAssigned,
        exerciseGroupId,
        submittedCount: sessionSubmissions.length,
        totalStudents: cls.studentIds ? cls.studentIds.length : 0,
        deadline: sessionDeadline,
        selfStudyCount: selfStudyMessageCount
      });
    }
  }

  return res.status(200).json({
    success: true,
    classId: cls.id,
    className: cls.name,
    totalSessions,
    isReviewLocked: !!cls.isReviewLocked,
    isStudentReviewLocked: user.role === 'STUDENT' ? studentIsReviewLocked : undefined,
    reviewLockMessage: cls.reviewLockMessage || null,
    sessions: sessionList
  });
};

// 2. Get Exercise details for a session (Tab 1)
export const getSessionExercise = (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const { classId, sessionId } = req.params;
  const sessionNum = parseSessionId(sessionId);
  const user = req.user!;

  const classes = db.get('classes');
  const cls = classes.find(c => c.id === classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  // Kiểm tra quyền xem lại bài tập cũ (Review Lock):
  if (user.role === 'STUDENT' && isStudentReviewLocked(cls, user.id)) {
    return res.status(403).json({
      success: false,
      isReviewLocked: true,
      message: cls.reviewLockMessage || 'Lớp học này đã kết thúc và đã bị khóa quyền xem lại bài tập cũ. Vui lòng liên hệ trung tâm hoặc giáo viên để được hỗ trợ.'
    });
  }

  const courses = db.get('courses');
  const course = courses.find(c => c.id === cls.courseId);

  const sessionTitle = course?.sessionTitles?.[sessionNum] ||
    course?.sessions?.find(s => s.sessionNumber === sessionNum)?.title ||
    `Buổi ${sessionNum}: Bài học & Thực hành Buổi ${sessionNum}`;

  const submissions = db.get('submissions').filter(s => s.classId === classId && s.sessionId === sessionNum);
  const hasSubmissions = submissions.length > 0;
  const isAssigned = !!(cls.sessionExerciseGroupIds?.[sessionNum] || hasSubmissions);
  const assignedExerciseGroupId = cls.sessionExerciseGroupIds?.[sessionNum] ||
    (hasSubmissions ? (course?.sessionExerciseGroupIds?.[sessionNum] || 'ex-group-1') : null);

  // Nếu buổi học này chưa được giáo viên giao bài tập cho lớp:
  if (!isAssigned || !assignedExerciseGroupId) {
    return res.status(200).json({
      success: true,
      classId,
      sessionId: sessionNum,
      sessionTitle,
      isAssigned: false,
      deadline: null,
      assignedAt: null,
      status: 'unassigned',
      submissionStatus: 'unassigned',
      gradingStatus: null,
      statusText: 'Unassigned',
      submissionStatusText: 'Unassigned',
      hasSubmitted: false,
      isGraded: false,
      message: 'Buổi học này chưa được giáo viên giao bài tập.',
      exerciseGroup: null,
      userSubmission: null
    });
  }

  // BẢO TOÀN LỊCH SỬ BÀI TẬP (SNAPSHOT ISOLATION PATTERN):
  const snapshotKey = `${classId}_${sessionNum}`;
  const snapshots = db.get('exerciseSnapshots') || {};
  let exerciseGroup: any = snapshots[snapshotKey];

  if (!exerciseGroup) {
    const exercises = db.get('exercises');
    exerciseGroup = exercises.find(ex => ex.id === assignedExerciseGroupId) || null;
  }

  let userSubmission = null;
  if (user.role === 'STUDENT') {
    userSubmission = submissions.find(s => s.studentId === user.id) || null;
  }

  // KIỂM SOÁT BẢO MẬT ĐÁP ÁN:
  // Học viên chỉ được xem đáp án (correctAnswer & explanation) khi giáo viên ĐÃ CHẤM XONG (userSubmission && userSubmission.score !== undefined).
  // Nếu chưa làm bài, hoặc đã nộp bài nhưng giáo viên chưa chấm -> Ẩn triệt để correctAnswer & explanation!
  let exerciseGroupToReturn = exerciseGroup;
  let userSubmissionToReturn = userSubmission;

  if (user.role === 'STUDENT') {
    const isGraded = !!(userSubmission && userSubmission.score !== undefined);

    if (!isGraded) {
      // Ẩn correctAnswer & explanation trong đề bài exerciseGroup
      if (exerciseGroup && exerciseGroup.sections) {
        exerciseGroupToReturn = {
          ...exerciseGroup,
          sections: exerciseGroup.sections.map((sec: any) => ({
            ...sec,
            questions: (sec.questions || []).map((q: any) => {
              const { correctAnswer, explanation, ...qWithoutAnswer } = q;
              return qWithoutAnswer;
            })
          }))
        };
      }

      // Nếu đã nộp bài nhưng chưa được giáo viên chấm xong: Ẩn correctAnswer, explanation, isCorrect trong userSubmission
      if (userSubmission) {
        userSubmissionToReturn = {
          ...userSubmission,
          answers: (userSubmission.answers || []).map((ans: any) => ({
            questionId: ans.questionId,
            answer: ans.answer
          }))
        };
      }
    }
  }

  const isGraded = !!(userSubmission && userSubmission.score !== undefined && userSubmission.score !== null);
  const hasSubmitted = !!userSubmission;
  const status: 'not_submitted' | 'submitted' | 'graded' = !userSubmission 
    ? 'not_submitted' 
    : (isGraded ? 'graded' : 'submitted');
  const submissionStatus = status;
  const statusText = status === 'not_submitted'
    ? 'Not Submitted'
    : (status === 'graded' ? 'Graded' : 'Submitted (Pending Review)');
  const submissionStatusText = statusText;
  const gradingStatus = hasSubmitted ? (isGraded ? 'graded' : 'pending') : null;

  const deadline = cls.sessionDeadlines?.[sessionNum] ||
    new Date(new Date(cls.createdAt).getTime() + sessionNum * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return res.status(200).json({
    success: true,
    classId,
    sessionId: sessionNum,
    sessionTitle,
    isAssigned: true,
    status,
    submissionStatus,
    gradingStatus,
    statusText,
    submissionStatusText,
    hasSubmitted,
    isGraded,
    deadline,
    assignedAt: cls.sessionAssignedAt?.[sessionNum] || null,
    aiWarningBanner: '⚠️ CẢNH BÁO NGHIÊM CẤM: Hệ thống phát hiện và nghiêm cấm việc sử dụng công cụ AI (ChatGPT, Claude...) để làm bài tập.',
    exerciseGroup: exerciseGroupToReturn,
    userSubmission: userSubmissionToReturn ? {
      ...userSubmissionToReturn,
      status: isGraded ? 'graded' : 'submitted',
      gradingStatus: isGraded ? 'graded' : 'pending'
    } : null,
    allSubmissions: user.role !== 'STUDENT' ? submissions : undefined
  });
};

// 3. Submit Exercise answers (Tab 1 - Student)
export const submitSessionExercise = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseSessionId(sessionId);
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
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  // Kiểm tra nếu lớp học hoặc học viên đã bị khóa quyền nộp/xem lại:
  if (user.role === 'STUDENT' && isStudentReviewLocked(cls, user.id)) {
    return res.status(403).json({
      success: false,
      isReviewLocked: true,
      message: 'Lớp học này đã kết thúc và đã bị khóa nộp hoặc xem lại bài tập.'
    });
  }

  const isAssigned = !!cls.sessionExerciseGroupIds?.[sessionNum];
  const assignedExerciseGroupId = cls.sessionExerciseGroupIds?.[sessionNum];
  if (!isAssigned || !assignedExerciseGroupId) {
    return res.status(400).json({
      success: false,
      message: 'Buổi học này chưa được giáo viên giao bài tập, không thể nộp bài.'
    });
  }

  const deadlineStr = cls.sessionDeadlines?.[sessionNum];
  const deadlineDate = deadlineStr
    ? new Date(deadlineStr + 'T23:59:59.999Z')
    : new Date(new Date(cls.createdAt).getTime() + sessionNum * 7 * 24 * 60 * 60 * 1000);
  const isLate = now > deadlineDate;

  // LƯU / ĐÓNG BĂNG BẢN SNAPSHOT BÀI TẬP TẠI THỜI ĐIỂM LỚP HỌC LÀM BÀI:
  const snapshotKey = `${classId}_${sessionNum}`;
  const snapshots = db.get('exerciseSnapshots') || {};
  let exerciseGroup = snapshots[snapshotKey];

  if (!exerciseGroup) {
    const exercises = db.get('exercises');
    const currentMasterExercise = exercises.find(ex => ex.id === assignedExerciseGroupId) || exercises[0];

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
      let isCorrect = false;

      // XỬ LÝ NHIỀU ĐÁP ÁN ĐÚNG CHO DẠNG FILL_BLANK (Alternative valid answers hoặc Multiple Blanks)
      if (Array.isArray(q.correctAnswer)) {
        if (Array.isArray(ans.answer)) {
          // Trường hợp câu hỏi có nhiều ô trống và học viên gửi mảng câu trả lời
          isCorrect = ans.answer.length === q.correctAnswer.length &&
            ans.answer.every((subAns: any, idx: number) => {
              const expected = q.correctAnswer[idx];
              if (Array.isArray(expected)) {
                return expected.some((exp: string) => String(exp).trim().toLowerCase() === String(subAns).trim().toLowerCase());
              }
              return String(expected).trim().toLowerCase() === String(subAns).trim().toLowerCase();
            });
        } else {
          // Trường hợp 1 ô trống nhưng có nhiều đáp án chấp nhận được (vd: ["100", "one hundred", "100°C"])
          const studentAnsStr = String(ans.answer || '').trim().toLowerCase();
          isCorrect = q.correctAnswer.some((ca: string) => String(ca).trim().toLowerCase() === studentAnsStr);
        }
      } else {
        const studentAnsStr = String(ans.answer || '').trim().toLowerCase();
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
      : undefined,
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

  const isGraded = newSubmission.score !== undefined;
  const safeSubmission = {
    ...newSubmission,
    answers: isGraded
      ? newSubmission.answers
      : (newSubmission.answers || []).map((ans: any) => ({
          questionId: ans.questionId,
          answer: ans.answer
        }))
  };

  return res.status(200).json({
    success: true,
    message: isLate 
      ? `Nộp bài thành công (Ghi nhận: Nộp quá hạn)! Bài làm đang chờ giáo viên chấm điểm.` 
      : `Nộp bài thành công! Bài làm đang chờ giáo viên chấm điểm.`,
    isLate,
    gradingStatus: isGraded ? 'graded' : 'pending',
    status: isGraded ? 'graded' : 'submitted',
    submissionStatus: isGraded ? 'graded' : 'submitted',
    totalQuestions: answers ? answers.length : 0,
    data: safeSubmission
  });
};


// 3.5 Get all submissions of a session (Teacher & Admin view)
export const getSessionSubmissions = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseSessionId(sessionId);

  const classes = db.get('classes');
  const cls = classes.find(c => c.id === classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  const users = db.get('users');
  const submissions = db.get('submissions').filter(s => s.classId === classId && s.sessionId === sessionNum);

  const enrichedSubmissions = submissions.map(sub => {
    const student = users.find(u => u.id === sub.studentId);
    const isGraded = sub.score !== undefined && sub.score !== null;
    return {
      ...sub,
      studentName: student ? student.fullname : 'Học viên',
      studentEmail: student ? student.email : '',
      status: isGraded ? 'graded' : 'submitted',
      submissionStatus: isGraded ? 'graded' : 'submitted',
      gradingStatus: isGraded ? 'graded' : 'pending',
      gradingStatusText: isGraded ? 'Graded' : 'Pending'
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
  const sessionNum = parseSessionId(sessionId);
  const user = req.user!;

  const classes = db.get('classes');
  const cls = classes.find(c => c.id === classId);
  if (user && user.role === 'STUDENT' && cls && isStudentReviewLocked(cls, user.id)) {
    return res.status(403).json({
      success: false,
      isReviewLocked: true,
      message: cls.reviewLockMessage || 'Lớp học này đã kết thúc và đã bị khóa quyền xem lại nội dung tự học.'
    });
  }

  const selfStudies = db.get('selfStudies');
  const index = selfStudies.findIndex(ss => ss.classId === classId && ss.sessionId === sessionNum);
  const selfStudy = index !== -1 ? selfStudies[index] : null;

  // Tự động ghi nhận thời gian xem cho học viên khi truy cập bài tự học đã có nội dung
  if (user && user.role === 'STUDENT' && selfStudy && selfStudy.content && selfStudy.content !== 'Chưa có nội dung tự học cho buổi này.') {
    if (!selfStudy.viewedBy) {
      selfStudy.viewedBy = {};
    }
    if (!selfStudy.viewedBy[user.id]) {
      selfStudy.viewedBy[user.id] = new Date().toISOString();
      selfStudies[index] = selfStudy;
      db.update('selfStudies', selfStudies);
    }
  }

  const users = db.get('users');
  const classStudents = cls && cls.studentIds ? users.filter(u => cls.studentIds.includes(u.id)) : [];
  const viewedByMap = selfStudy?.viewedBy || {};

  const viewers = classStudents.map(student => {
    const viewTime = viewedByMap[student.id];
    const isViewed = !!viewTime;
    return {
      studentId: student.id,
      fullname: student.fullname,
      studentName: student.fullname,
      email: student.email,
      status: isViewed ? 'viewed' : 'unviewed',
      statusText: isViewed ? 'Viewed' : 'Unviewed',
      isViewed,
      viewedAt: viewTime || null
    };
  });

  const selfStudyData = selfStudy || {
    id: null,
    classId,
    sessionId: sessionNum,
    content: 'Chưa có nội dung tự học cho buổi này.',
    videoUrl: '',
    viewedBy: {}
  };

  return res.status(200).json({
    success: true,
    classId,
    sessionId: sessionNum,
    data: {
      ...selfStudyData,
      viewers
    },
    viewers
  });
};

// 6. Post / Edit Self-Study content (Tab 2 - Teacher)
export const updateSelfStudy = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseSessionId(sessionId);
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
  const sessionNum = parseSessionId(sessionId);
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
  const sessionNum = parseSessionId(sessionId);

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

  const students = classStudents.map(student => {
    const viewTime = viewedByMap[student.id];
    const isViewed = !!viewTime;
    return {
      studentId: student.id,
      fullname: student.fullname,
      studentName: student.fullname,
      email: student.email,
      status: isViewed ? 'viewed' : 'unviewed',
      statusText: isViewed ? 'Viewed' : 'Unviewed',
      isViewed,
      viewedAt: viewTime || null
    };
  });

  return res.status(200).json({
    success: true,
    classId,
    sessionId: sessionNum,
    total: students.length,
    summary: {
      totalStudents: classStudents.length,
      readCount: readList.length,
      unreadCount: unreadList.length,
      readPercentage: classStudents.length > 0 ? Math.round((readList.length / classStudents.length) * 100) : 0
    },
    students,
    data: students,
    viewers: students,
    readList,
    unreadList
  });
};

// 7. Gán bài tập cho buổi học của Lớp sau khi dạy xong (Teacher / Admin)
export const assignSessionExercise = (req: AuthenticatedRequest, res: Response) => {
  const { classId, sessionId } = req.params;
  const sessionNum = parseSessionId(sessionId);
  const { exerciseGroupId, deadline } = req.body;
  const user = req.user!;

  const classes = db.get('classes');
  const classIndex = classes.findIndex(c => c.id === classId);
  if (classIndex === -1) {
    return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
  }

  const cls = classes[classIndex];

  // Quyền: ADMIN hoặc TEACHER phụ trách lớp
  if (user.role === 'TEACHER' && cls.teacherId !== user.id) {
    return res.status(403).json({ success: false, message: 'Bạn không phải là giáo viên phụ trách của lớp học này.' });
  }

  const courses = db.get('courses');
  const course = courses.find(c => c.id === cls.courseId);

  // Xác định exerciseGroupId cần gán:
  // 1. Lấy từ request body nếu có truyền
  // 2. Nếu không truyền, lấy mặc định từ course.sessionExerciseGroupIds
  const exercises = db.get('exercises');
  let selectedExerciseGroupId = exerciseGroupId;

  if (!selectedExerciseGroupId) {
    selectedExerciseGroupId = course?.sessionExerciseGroupIds?.[sessionNum] ||
      course?.sessions?.find(s => s.sessionNumber === sessionNum)?.exerciseGroupId;
  }

  if (!selectedExerciseGroupId) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn nhóm bài tập từ kho bài tập để gán cho buổi học này.'
    });
  }

  const exerciseExists = exercises.find(e => e.id === selectedExerciseGroupId);
  if (!exerciseExists) {
    return res.status(400).json({
      success: false,
      message: `Nhóm bài tập '${selectedExerciseGroupId}' không tồn tại trong kho bài tập.`
    });
  }

  if (!cls.sessionExerciseGroupIds) {
    cls.sessionExerciseGroupIds = {};
  }
  if (!cls.sessionDeadlines) {
    cls.sessionDeadlines = {};
  }
  if (!cls.sessionAssignedAt) {
    cls.sessionAssignedAt = {};
  }

  const now = new Date();
  let finalDeadline = deadline;
  if (!finalDeadline) {
    const defaultDeadlineDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    finalDeadline = defaultDeadlineDate.toISOString().split('T')[0];
  }

  cls.sessionExerciseGroupIds[sessionNum] = selectedExerciseGroupId;
  cls.sessionDeadlines[sessionNum] = finalDeadline;
  cls.sessionAssignedAt[sessionNum] = now.toISOString();

  classes[classIndex] = cls;
  db.update('classes', classes);

  return res.status(200).json({
    success: true,
    message: `Gán bài tập cho Buổi ${sessionNum} của lớp '${cls.name}' thành công!`,
    data: {
      classId: cls.id,
      className: cls.name,
      sessionId: sessionNum,
      isAssigned: true,
      exerciseGroupId: selectedExerciseGroupId,
      exerciseGroupName: exerciseExists.name,
      deadline: finalDeadline,
      assignedAt: cls.sessionAssignedAt[sessionNum]
    }
  });
};
