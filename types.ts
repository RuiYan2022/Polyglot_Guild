
export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
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
  // Dynamic progression gates
  unlockEasyToMedium: number;
  unlockMediumToHard: number;
  unlockHardToChallenging: number;
}

export interface StudentProgress {
  id: string;
  studentUid: string; // Linked to StudentProfile.uid
  studentName: string; 
  teacherId: string;
  classId: string; 
  questionSetId: string;
  completedQuestions: string[]; // Question IDs
  scores: Record<string, number>; // questionId -> score
  draftCodes?: Record<string, string>; // questionId -> current work code
  lastActive: number;
  language: ProgrammingLanguage;
}

export interface AIResponse {
  success: boolean;
  feedback?: string;
  score?: number;
  suggestions?: string[];
}
