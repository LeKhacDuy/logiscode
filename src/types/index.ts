export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type UserStatus = 'active' | 'lock';

export interface User {
  id: string;
  email: string;
  fullname: string;
  role: Role;
  status: UserStatus;
  passwordHash?: string;
  rawPassword?: string;
  createdAt: string;
}


export type CourseLevel = 'foundation' | 'intermediate' | 'advanced';

export interface CourseSession {
  sessionNumber: number;
  title?: string; // Tiêu đề buổi học
  exerciseGroupId?: string; // ID nhóm bài tập gán cho buổi
}

export interface Course {
  id: string;
  name: string;
  totalSessions: number;
  level: CourseLevel;
  sessionTitles?: Record<string | number, string>; // session number -> title của buổi học
  sessionExerciseGroupIds: Record<string | number, string>; // session number -> exerciseGroupId
  sessions?: CourseSession[]; // Danh sách các buổi học kèm tiêu đề và nhóm bài tập đã gán
  createdAt: string;
}


export type ClassStatus = 'schedule' | 'ongoing' | 'ended';

export interface Class {
  id: string;
  name: string;
  courseId: string;
  status: ClassStatus;
  teacherId: string;
  studentIds: string[];
  sessionExerciseGroupIds?: Record<string | number, string>; // sessionNum -> exerciseGroupId đã gán cho lớp
  sessionDeadlines?: Record<string | number, string>; // sessionNum -> hạn nộp bài của lớp
  sessionAssignedAt?: Record<string | number, string>; // sessionNum -> thời điểm gán bài
  isReviewLocked?: boolean; // Khóa toàn bộ học viên trong lớp không cho xem lại bài tập cũ
  lockedReviewStudentIds?: string[]; // Danh sách học viên cụ thể bị khóa xem lại (nếu chỉ khóa từng cá nhân)
  reviewLockMessage?: string; // Thông báo tùy biến hiển thị khi học viên bị khóa xem lại
  createdAt: string;
}

export type QuestionType = 'multiple_choice' | 'essay' | 'fill_blank' | 'speaking';

export interface Question {
  id: string;
  type: QuestionType | string; // Cho phép tương thích ngược nếu còn dữ liệu cũ
  prompt: string;
  options?: string[];
  correctAnswer?: string | string[]; // Hỗ trợ nhiều đáp án đúng chấp nhận được cho dạng fill_blank
  explanation?: string;
}

export interface ExerciseSection {
  id: string;
  title: string;
  passage?: string; // Đoạn văn đọc hiểu (Reading Passage - optional)
  audioUrl?: string; // Link file audio nghe cho cả Section (Section Audio - optional)
  questions: Question[];
}


export type ExerciseStatus = 'active' | 'inactive';

export interface ExerciseGroup {
  id: string;
  name: string;
  status: ExerciseStatus;
  sections: ExerciseSection[];
  createdAt: string;
}

export interface SubmissionAnswer {
  questionId: string;
  answer: any;
  isCorrect?: boolean;
  correctAnswer?: string | string[];
  explanation?: string;
}

export interface Submission {
  id: string;
  classId: string;
  sessionId: number;
  studentId: string;
  answers: SubmissionAnswer[];
  audioBlobUrl?: string; // For speaking exercise upload
  score?: number; // Điểm tổng kết do giáo viên chấm (0-100)
  autoScore?: number; // Điểm tự động tính cho các câu trắc nghiệm/điền từ (0-100)
  correctCount?: number; // Số câu đúng
  totalQuestions?: number; // Tổng số câu
  feedback?: string;
  isLate: boolean;
  submittedAt: string;
}


export interface SelfStudy {
  id: string;
  classId: string;
  sessionId: number;
  content: string;
  videoUrl?: string;
  updatedBy: string;
  updatedAt: string;
  viewedBy: Record<string, string>; // studentId -> timestamp
}
