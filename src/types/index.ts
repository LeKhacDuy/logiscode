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

export interface Course {
  id: string;
  name: string;
  totalSessions: number;
  level: CourseLevel;
  sessionExerciseGroupIds: Record<number, string>; // session number -> exerciseGroupId
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
  createdAt: string;
}

export type QuestionType = 'multiple_choice' | 'essay' | 'fill_blank' | 'listening' | 'speaking';

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  audioUrl?: string; // For listening
}

export interface ExerciseSection {
  id: string;
  title: string;
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
}

export interface Submission {
  id: string;
  classId: string;
  sessionId: number;
  studentId: string;
  answers: SubmissionAnswer[];
  audioBlobUrl?: string; // For speaking exercise upload
  score?: number;
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
