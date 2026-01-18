
export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

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
  createdAt: number;
}

export interface LanguageStats {
  language: ProgrammingLanguage;
  xp: number;
  missionsCompleted: number;
}

export interface StudentProfile {
  name: string;
  globalXp: number;
  languageMastery: Record<string, number>; // Language -> XP
  completedSets: string[]; // QuestionSet IDs
}

export interface Question {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  solutionHint: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
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
}

export interface StudentProgress {
  id: string;
  studentName: string;
  teacherId: string;
  classId: string; // Linked class
  questionSetId: string;
  completedQuestions: string[]; // Question IDs
  scores: Record<string, number>; // questionId -> score
  lastActive: number;
  language: ProgrammingLanguage;
}

export interface AIResponse {
  success: boolean;
  feedback?: string;
  score?: number;
  suggestions?: string[];
}