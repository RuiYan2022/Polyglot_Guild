
export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  TA = 'TA'
}

export type StudentStatus = 'pending' | 'approved' | 'denied';

export enum ProgrammingLanguage {
  PYTHON = 'Python',
  JAVASCRIPT = 'Javascript',
  JAVA = 'Java',
  CPP = 'C++',
  TYPESCRIPT = 'TypeScript',
  RUBY = 'Ruby'
}

export interface TeacherProfile {
  uid: string;
  name: string;
  email: string;
  schoolName: string;
  academyCode: string; // Global teacher code
}

export interface ClassProfile {
  id: string;
  teacherId: string;
  name: string;
  code: string; // Unique class-specific code for students
  taKey: string; // Secret key for TA access
  createdAt: number;
}

export interface StudentProfile {
  uid: string;
  name: string;
  email: string;
  globalXp: number;
  languageMastery: Record<string, number>; // Language -> XP
  completedSets: string[]; // QuestionSet IDs
  status: StudentStatus;
  classId: string;
  masterKey: string; // The teacherId (UID) they belong to
  unlockedSets: string[]; // IDs of Mission Packs they have unlocked with a passcode
}

export interface Question {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  solutionHint: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Challenging';
  points: number;
}

export interface QuestionSet {
  id: string;
  teacherId: string;
  authorName: string;
  title: string;
  description: string;
  language: ProgrammingLanguage;
  passcode: string; // Portal Passcode
  questions: Question[];
  isPublic: boolean;
  createdAt: number;
  unlockEasyToMedium: number;
  unlockMediumToHard: number;
  unlockHardToChallenging: number;
}

export interface FeedbackEntry {
  timestamp: number;
  questionId: string;
  success: boolean;
  score: number;
  feedback: string;
}

export interface StudentProgress {
  id: string;
  studentUid: string;
  studentName: string; 
  teacherId: string;
  classId: string; 
  questionSetId: string;
  completedQuestions: string[]; 
  scores: Record<string, number>; 
  draftCodes?: Record<string, string>; 
  feedbackHistory?: FeedbackEntry[]; // New persistent history
  lastActive: number;
  language: ProgrammingLanguage;
}

export interface AIResponse {
  success: boolean;
  feedback?: string;
  score?: number;
  suggestions?: string[];
}
