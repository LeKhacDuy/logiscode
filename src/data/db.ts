import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Course, Class, ExerciseGroup, Submission, SelfStudy } from '../types';

export interface DatabaseSchema {
  users: User[];
  courses: Course[];
  classes: Class[];
  exercises: ExerciseGroup[];
  submissions: Submission[];
  selfStudies: SelfStudy[];
  exerciseSnapshots: Record<string, ExerciseGroup>; // key: `${classId}_${sessionId}` -> frozen exercise snapshot
}

const DB_FILE_PATH = process.env.DATA_PATH || path.join(__dirname, 'db_data.json');


const defaultPasswordHash = bcrypt.hashSync('123456', 10);

const initialSeedData: DatabaseSchema = {
  exerciseSnapshots: {},
  users: [

    {
      id: 'u-admin-1',
      email: 'admin@edumanage.com',
      fullname: 'Quản Trị Viên (Admin)',
      role: 'ADMIN',
      status: 'active',
      passwordHash: defaultPasswordHash,
      rawPassword: '123456',
      createdAt: new Date().toISOString()
    },
    {
      id: 'u-teacher-1',
      email: 'gv.an@edumanage.com',
      fullname: 'Thầy Nguyễn Văn An',
      role: 'TEACHER',
      status: 'active',
      passwordHash: defaultPasswordHash,
      rawPassword: '123456',
      createdAt: new Date().toISOString()
    },
    {
      id: 'u-teacher-2',
      email: 'gv.huong@edumanage.com',
      fullname: 'Cô Trần Thị Hương',
      role: 'TEACHER',
      status: 'active',
      passwordHash: defaultPasswordHash,
      rawPassword: '123456',
      createdAt: new Date().toISOString()
    },
    {
      id: 'u-student-1',
      email: 'hv.binh@edumanage.com',
      fullname: 'Lê Văn Bình',
      role: 'STUDENT',
      status: 'active',
      passwordHash: defaultPasswordHash,
      rawPassword: '123456',
      createdAt: new Date().toISOString()
    },
    {
      id: 'u-student-2',
      email: 'hv.chi@edumanage.com',
      fullname: 'Phạm Minh Chi',
      role: 'STUDENT',
      status: 'active',
      passwordHash: defaultPasswordHash,
      rawPassword: '123456',
      createdAt: new Date().toISOString()
    },
    {
      id: 'u-student-3',
      email: 'hv.duong@edumanage.com',
      fullname: 'Hoàng Thùy Dương',
      role: 'STUDENT',
      status: 'active',
      passwordHash: defaultPasswordHash,
      rawPassword: '123456',
      createdAt: new Date().toISOString()
    },
    {
      id: 'u-student-4',
      email: 'hv.dung@edumanage.com',
      fullname: 'Ngô Quốc Dũng',
      role: 'STUDENT',
      status: 'lock',
      passwordHash: defaultPasswordHash,
      rawPassword: '123456',
      createdAt: new Date().toISOString()
    }
  ],
  courses: [
    {
      id: 'c-ielts-found',
      name: 'IELTS Preparation Foundation',
      totalSessions: 12,
      level: 'foundation',
      sessionExerciseGroupIds: {
        1: 'ex-group-1',
        2: 'ex-group-2'
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'c-react-fullstack',
      name: 'Lập Trình Web React & Node.js Fullstack',
      totalSessions: 24,
      level: 'intermediate',
      sessionExerciseGroupIds: {
        1: 'ex-group-1'
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'c-biz-english',
      name: 'Business English Advanced Communication',
      totalSessions: 36,
      level: 'advanced',
      sessionExerciseGroupIds: {},
      createdAt: new Date().toISOString()
    }
  ],
  classes: [
    {
      id: 'cls-ielts-01',
      name: 'IELTS Foundation K102',
      courseId: 'c-ielts-found',
      status: 'ongoing',
      teacherId: 'u-teacher-1',
      studentIds: ['u-student-1', 'u-student-2', 'u-student-3'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'cls-react-02',
      name: 'React Fullstack Web Dev K45',
      courseId: 'c-react-fullstack',
      status: 'ongoing',
      teacherId: 'u-teacher-2',
      studentIds: ['u-student-1', 'u-student-3'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'cls-biz-03',
      name: 'Business English Elite K08',
      courseId: 'c-biz-english',
      status: 'schedule',
      teacherId: 'u-teacher-1',
      studentIds: ['u-student-2'],
      createdAt: new Date().toISOString()
    }
  ],
  exercises: [
    {
      id: 'ex-group-1',
      name: 'Nhóm bài tập Buổi 1: Grammar & Vocabulary Basics',
      status: 'active',
      createdAt: new Date().toISOString(),
      sections: [
        {
          id: 'sec-1',
          title: 'Phần 1: Multiple Choice & Fill-in-the-blank',
          questions: [
            {
              id: 'q-mc-1',
              type: 'multiple_choice',
              prompt: 'Which sentence uses the present perfect tense correctly?',
              options: [
                'A. She has finished her assignment yesterday.',
                'B. She has finished her assignment already.',
                'C. She finishes her assignment since 2 hours.',
                'D. She had finish her assignment.'
              ],
              correctAnswer: 'B. She has finished her assignment already.',
              explanation: 'Present perfect uses "have/has + past participle" with time signals like "already" without specific past time expressions like "yesterday".'
            },
            {
              id: 'q-fb-1',
              type: 'fill_blank',
              prompt: 'Fill in the correct prepositions: "He has been working here _____ 2020."',
              correctAnswer: 'since',
              explanation: 'Use "since" for a specific point in time (2020), and "for" for a duration of time.'
            }
          ]
        },
        {
          id: 'sec-2',
          title: 'Phần 2: Listening & Speaking Skills',
          questions: [
            {
              id: 'q-lis-1',
              type: 'listening',
              prompt: 'Nghe đoạn hội thoại sau và chọn câu trả lời đúng:',
              audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
              options: [
                'A. The meeting will start at 9:00 AM.',
                'B. The meeting is postponed until next Monday.',
                'C. The meeting takes place in Room 402.',
                'D. The meeting was cancelled.'
              ],
              correctAnswer: 'C. The meeting takes place in Room 402.',
              explanation: 'In the audio, the speaker confirms Room 402 is reserved for the 10:00 AM session.'
            },
            {
              id: 'q-spk-1',
              type: 'speaking',
              prompt: 'Hãy nói và thu âm đoạn văn ngắn (1-2 phút) giới thiệu về mục tiêu học tập của bạn trong khóa học này.',
              explanation: 'Đánh giá dựa trên độ lưu khoát, phát âm chuẩn và cấu trúc ngữ pháp.'
            },
            {
              id: 'q-ess-1',
              type: 'essay',
              prompt: 'Viết một đoạn văn ngắn (150-200 từ) trình bày suy nghĩ của bạn về tầm quan trọng của việc học tiếng Anh trong thời đại AI.',
              explanation: 'Giáo viên sẽ chấm trực tiếp điểm nội dung và vốn từ vựng.'
            }
          ]
        }
      ]
    },
    {
      id: 'ex-group-2',
      name: 'Nhóm bài tập Buổi 2: Reading & Listening Practice',
      status: 'active',
      createdAt: new Date().toISOString(),
      sections: []
    }
  ],
  submissions: [
    {
      id: 'sub-1',
      classId: 'cls-ielts-01',
      sessionId: 1,
      studentId: 'u-student-1',
      answers: [
        { questionId: 'q-mc-1', answer: 'B. She has finished her assignment already.' },
        { questionId: 'q-fb-1', answer: 'since' },
        { questionId: 'q-lis-1', answer: 'C. The meeting takes place in Room 402.' },
        { questionId: 'q-ess-1', answer: 'English remains vital in the AI era as it enables humans to write precise prompts, evaluate machine responses, and communicate globally.' }
      ],
      audioBlobUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      score: 95,
      feedback: 'Bài làm rất tốt, phát âm rõ ràng, bài tự luận mạch lạc!',
      isLate: false,
      submittedAt: new Date().toISOString()
    }
  ],
  selfStudies: [
    {
      id: 'ss-1',
      classId: 'cls-ielts-01',
      sessionId: 1,
      content: '### Tài liệu Tự học Buổi 1: IELTS Grammar & Vocab Essentials\n- Đọc tài liệu Unit 1 trong giáo trình trang 12-25.\n- Xem video bài giảng về Thì Hiện tại Hoàn thành.\n- Ghi chú 10 từ vựng chuyên ngành.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      updatedBy: 'u-teacher-1',
      updatedAt: new Date().toISOString(),
      viewedBy: {
        'u-student-1': new Date().toISOString()
      }
    }
  ]
};

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error reading db_data.json, falling back to seed data:', error);
    }
    this.saveData(initialSeedData);
    return initialSeedData;
  }

  public saveData(data?: DatabaseSchema): void {
    if (data) {
      this.data = data;
    }
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving db_data.json:', error);
    }
  }

  public get<K extends keyof DatabaseSchema>(table: K): DatabaseSchema[K] {
    return this.data[table];
  }

  public update<K extends keyof DatabaseSchema>(table: K, newData: DatabaseSchema[K]): void {
    this.data[table] = newData;
    this.saveData();
  }
}

export const db = new Database();
