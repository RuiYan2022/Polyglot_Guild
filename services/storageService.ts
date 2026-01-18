
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  limit,
  deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { TeacherProfile, QuestionSet, StudentProgress, StudentProfile, ClassProfile } from '../types';

class StorageService {
  private handleErr(error: any, context: string) {
    console.error(`Firestore Error [${context}]:`, error);
    if (error.code === 'permission-denied') {
      throw new Error(`Permission Denied: Please check your Firebase Firestore Security Rules for the '${context}' operation.`);
    }
    throw error;
  }

  // --- Teachers ---
  async getTeacherByCode(code: string): Promise<TeacherProfile | undefined> {
    try {
      const q = query(collection(db, "teachers"), where("academyCode", "==", code.toUpperCase()), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return undefined;
      return querySnapshot.docs[0].data() as TeacherProfile;
    } catch (error) {
      this.handleErr(error, "getTeacherByCode");
    }
  }

  async saveTeacher(profile: TeacherProfile): Promise<void> {
    try {
      await setDoc(doc(db, "teachers", profile.uid), profile);
    } catch (error) {
      this.handleErr(error, "saveTeacher");
    }
  }

  // --- Classes ---
  async getClasses(teacherId: string): Promise<ClassProfile[]> {
    try {
      const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ClassProfile);
    } catch (error) {
      this.handleErr(error, "getClasses");
      return [];
    }
  }

  async getClassByCode(code: string): Promise<ClassProfile | undefined> {
    try {
      const q = query(collection(db, "classes"), where("code", "==", code.toUpperCase()), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return undefined;
      return querySnapshot.docs[0].data() as ClassProfile;
    } catch (error) {
      this.handleErr(error, "getClassByCode");
    }
  }

  async saveClass(classData: ClassProfile): Promise<void> {
    try {
      await setDoc(doc(db, "classes", classData.id), classData);
    } catch (error) {
      this.handleErr(error, "saveClass");
    }
  }

  async deleteClass(classId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "classes", classId));
    } catch (error) {
      this.handleErr(error, "deleteClass");
    }
  }

  // --- Question Sets ---
  async getQuestionSets(teacherId: string): Promise<QuestionSet[]> {
    try {
      const q = query(
        collection(db, "questionSets"), 
        where("teacherId", "==", teacherId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => doc.data() as QuestionSet)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      this.handleErr(error, "getQuestionSets");
      return [];
    }
  }

  async getPublicQuestionSets(): Promise<QuestionSet[]> {
    try {
      const q = query(
        collection(db, "questionSets"), 
        where("isPublic", "==", true)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => doc.data() as QuestionSet)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      this.handleErr(error, "getPublicQuestionSets");
      return [];
    }
  }

  async getQuestionSetByPortal(teacherId: string, passcode: string): Promise<QuestionSet | undefined> {
    try {
      const q = query(
        collection(db, "questionSets"), 
        where("teacherId", "==", teacherId),
        where("passcode", "==", passcode.toUpperCase()),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return undefined;
      return querySnapshot.docs[0].data() as QuestionSet;
    } catch (error) {
      this.handleErr(error, "getQuestionSetByPortal");
    }
  }

  async saveQuestionSet(set: QuestionSet): Promise<void> {
    try {
      await setDoc(doc(db, "questionSets", set.id), {
        ...set,
        createdAt: Date.now()
      });
    } catch (error) {
      this.handleErr(error, "saveQuestionSet");
    }
  }

  async cloneQuestionSet(setId: string, newTeacherId: string): Promise<void> {
    try {
      const originalRef = doc(db, "questionSets", setId);
      const originalSnap = await getDoc(originalRef);
      
      if (originalSnap.exists()) {
        const original = originalSnap.data() as QuestionSet;
        const newId = `set_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const clone: QuestionSet = {
          ...original,
          id: newId,
          teacherId: newTeacherId,
          isPublic: false,
          createdAt: Date.now()
        };
        await this.saveQuestionSet(clone);
      }
    } catch (error) {
      this.handleErr(error, "cloneQuestionSet");
    }
  }

  // --- Student Progress & Global Mastery ---
  async getProgress(teacherId: string): Promise<StudentProgress[]> {
    try {
      const q = query(
        collection(db, "progress"), 
        where("teacherId", "==", teacherId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => doc.data() as StudentProgress)
        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
    } catch (error) {
      this.handleErr(error, "getProgress");
      return [];
    }
  }

  async saveProgress(progress: StudentProgress): Promise<void> {
    try {
      const progressRef = doc(db, "progress", progress.id);
      await setDoc(progressRef, {
        ...progress,
        lastActive: Date.now()
      }, { merge: true });
      
      await this.updateGlobalStudentStats(progress.studentName);
    } catch (error) {
      this.handleErr(error, "saveProgress");
    }
  }

  async getStudentProgress(studentName: string, teacherId: string): Promise<StudentProgress[]> {
    try {
      const q = query(
        collection(db, "progress"), 
        where("studentName", "==", studentName),
        where("teacherId", "==", teacherId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as StudentProgress);
    } catch (error) {
      this.handleErr(error, "getStudentProgress");
      return [];
    }
  }

  private async updateGlobalStudentStats(name: string): Promise<void> {
    try {
      const q = query(collection(db, "progress"), where("studentName", "==", name));
      const querySnapshot = await getDocs(q);
      const allProgress = querySnapshot.docs.map(doc => doc.data() as StudentProgress);
      
      const languageMastery: Record<string, number> = {};
      let globalXp = 0;
      const completedSets: string[] = [];

      allProgress.forEach(p => {
        const scores: Record<string, number> = p.scores || {};
        const setXp: number = Object.values(scores).reduce((acc: number, score: number) => acc + (score || 0), 0);
        
        const languageKey = String(p.language);
        languageMastery[languageKey] = (languageMastery[languageKey] || 0) + setXp;
        globalXp += setXp;
        completedSets.push(p.questionSetId);
      });

      const studentRef = doc(db, "students", name.toLowerCase());
      const profile: StudentProfile = {
        name,
        globalXp,
        languageMastery,
        completedSets: Array.from(new Set(completedSets))
      };

      await setDoc(studentRef, profile);
    } catch (error) {
      this.handleErr(error, "updateGlobalStudentStats");
    }
  }

  async getGlobalStudentProfile(name: string): Promise<StudentProfile | undefined> {
    try {
      const studentRef = doc(db, "students", name.toLowerCase());
      const snap = await getDoc(studentRef);
      return snap.exists() ? snap.data() as StudentProfile : undefined;
    } catch (error) {
      this.handleErr(error, "getGlobalStudentProfile");
    }
  }
}

export const storageService = new StorageService();