
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  limit,
  deleteDoc,
  updateDoc,
  arrayUnion,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { TeacherProfile, QuestionSet, StudentProgress, StudentProfile, ClassProfile, StudentStatus } from '../types';

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

  // --- Students ---
  async getStudentProfile(uid: string): Promise<StudentProfile | undefined> {
    try {
      const docRef = doc(db, "students", uid);
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() as StudentProfile : undefined;
    } catch (error) {
      this.handleErr(error, "getStudentProfile");
    }
  }

  async saveStudentProfile(profile: StudentProfile): Promise<void> {
    try {
      await setDoc(doc(db, "students", profile.uid), profile);
    } catch (error) {
      this.handleErr(error, "saveStudentProfile");
    }
  }

  async getPendingStudents(teacherId: string): Promise<StudentProfile[]> {
    try {
      const q = query(
        collection(db, "students"), 
        where("masterKey", "==", teacherId),
        where("status", "==", "pending")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as StudentProfile);
    } catch (error) {
      this.handleErr(error, "getPendingStudents");
      return [];
    }
  }

  async getApprovedStudents(teacherId: string): Promise<StudentProfile[]> {
    try {
      const q = query(
        collection(db, "students"), 
        where("masterKey", "==", teacherId),
        where("status", "==", "approved")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as StudentProfile);
    } catch (error) {
      this.handleErr(error, "getApprovedStudents");
      return [];
    }
  }

  async getAcademyLeaderboard(teacherId: string, max: number = 10): Promise<StudentProfile[]> {
    try {
      const q = query(
        collection(db, "students"),
        where("masterKey", "==", teacherId),
        where("status", "==", "approved")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => doc.data() as StudentProfile)
        .sort((a, b) => (b.globalXp || 0) - (a.globalXp || 0))
        .slice(0, max);
    } catch (error) {
      this.handleErr(error, "getAcademyLeaderboard");
      return [];
    }
  }

  async updateStudentStatus(uid: string, status: StudentStatus): Promise<void> {
    try {
      const docRef = doc(db, "students", uid);
      await updateDoc(docRef, { status });
    } catch (error) {
      this.handleErr(error, "updateStudentStatus");
    }
  }

  async unlockMissionPack(uid: string, setId: string): Promise<void> {
    try {
      const docRef = doc(db, "students", uid);
      await updateDoc(docRef, {
        unlockedSets: arrayUnion(setId)
      });
    } catch (error) {
      this.handleErr(error, "unlockMissionPack");
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

  async deleteQuestionSet(setId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "questionSets", setId));
    } catch (error) {
      this.handleErr(error, "deleteQuestionSet");
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

  // --- Progress ---
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
      
      await this.updateGlobalStudentStats(progress.studentUid, progress.studentName);
    } catch (error) {
      this.handleErr(error, "saveProgress");
    }
  }

  async getStudentProgressByUid(studentUid: string, teacherId: string): Promise<StudentProgress[]> {
    try {
      const q = query(
        collection(db, "progress"), 
        where("studentUid", "==", studentUid),
        where("teacherId", "==", teacherId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as StudentProgress);
    } catch (error) {
      this.handleErr(error, "getStudentProgressByUid");
      return [];
    }
  }

  private async updateGlobalStudentStats(uid: string, name: string): Promise<void> {
    try {
      const q = query(collection(db, "progress"), where("studentUid", "==", uid));
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

      const studentRef = doc(db, "students", uid);
      await setDoc(studentRef, {
        name,
        globalXp,
        languageMastery,
        completedSets: Array.from(new Set(completedSets))
      }, { merge: true });
    } catch (error) {
      this.handleErr(error, "updateGlobalStudentStats");
    }
  }
}

export const storageService = new StorageService();