
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
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";
import { TeacherProfile, QuestionSet, StudentProgress, StudentProfile, ClassProfile, StudentStatus, Directive } from '../types';

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

  async verifyTAAccess(academyCode: string, classCode: string, taKey: string): Promise<{ teacher: TeacherProfile, class: ClassProfile } | undefined> {
    try {
      const teacher = await this.getTeacherByCode(academyCode);
      if (!teacher) return undefined;

      const q = query(
        collection(db, "classes"), 
        where("code", "==", classCode.toUpperCase()), 
        where("teacherId", "==", teacher.uid),
        where("taKey", "==", taKey.toUpperCase()),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return undefined;
      
      return {
        teacher,
        class: querySnapshot.docs[0].data() as ClassProfile
      };
    } catch (error) {
      this.handleErr(error, "verifyTAAccess");
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
      if (!snap.exists()) return undefined;
      
      const profile = snap.data() as StudentProfile;
      
      // Check for daily reset
      const now = Date.now();
      const lastReset = profile.lastDailyReset || 0;
      const isNewDay = new Date(now).toDateString() !== new Date(lastReset).toDateString();
      
      if (isNewDay) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const wasActiveYesterday = new Date(lastReset).toDateString() === yesterday.toDateString();
        
        const updatedProfile = {
          ...profile,
          dailyPoints: 0,
          lastDailyReset: now,
          streak: wasActiveYesterday ? (profile.streak || 0) : 0
        };
        await this.saveStudentProfile(updatedProfile);
        return updatedProfile;
      }
      
      return profile;
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

  async getStudentsByClass(classId: string): Promise<StudentProfile[]> {
    try {
      const q = query(
        collection(db, "students"), 
        where("classId", "==", classId),
        where("status", "==", "approved")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as StudentProfile);
    } catch (error) {
      this.handleErr(error, "getStudentsByClass");
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

  async getProgressByClass(classId: string): Promise<StudentProgress[]> {
    try {
      const q = query(
        collection(db, "progress"), 
        where("classId", "==", classId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => doc.data() as StudentProgress);
    } catch (error) {
      this.handleErr(error, "getProgressByClass");
      return [];
    }
  }

  async saveProgress(progress: StudentProgress, difficulty?: string, points?: number): Promise<void> {
    try {
      const progressRef = doc(db, "progress", progress.id);
      await setDoc(progressRef, {
        ...progress,
        lastActive: Date.now()
      }, { merge: true });
      
      await this.updateGlobalStudentStats(progress.studentUid, progress.studentName, difficulty, points);
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

  // --- Directives (Guild Comms) ---
  async sendDirective(directive: Directive): Promise<void> {
    try {
      await setDoc(doc(db, "directives", directive.id), directive);
    } catch (error) {
      this.handleErr(error, "sendDirective");
    }
  }

  subscribeToDirectives(studentUid: string, callback: (directives: Directive[]) => void) {
    const q = query(
      collection(db, "directives"),
      where("studentUid", "==", studentUid),
      orderBy("timestamp", "desc")
    );
    
    return onSnapshot(q, (snapshot) => {
      const directives = snapshot.docs.map(doc => doc.data() as Directive);
      callback(directives);
    }, (error) => {
      console.error("Directives Subscription Error:", error);
    });
  }

  async markDirectiveAsRead(directiveId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "directives", directiveId), { isRead: true });
    } catch (error) {
      this.handleErr(error, "markDirectiveAsRead");
    }
  }

  private async updateGlobalStudentStats(uid: string, name: string, difficulty?: string, earnedPoints?: number): Promise<void> {
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
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) return;
      
      const currentProfile = studentSnap.data() as StudentProfile;
      let updatedXp = globalXp;
      let dailyPoints = currentProfile.dailyPoints || 0;
      let streak = currentProfile.streak || 0;
      let overdriveQuestionsLeft = currentProfile.overdriveQuestionsLeft || 0;
      let overdriveSessionsCompleted = currentProfile.overdriveSessionsCompleted || 0;
      let lastDailyReset = currentProfile.lastDailyReset || Date.now();

      // Gamification Logic if a question was just completed
      if (difficulty && earnedPoints && earnedPoints > 0) {
        // 1. Handle Overdrive (Double XP)
        if (overdriveQuestionsLeft > 0) {
          updatedXp += earnedPoints; // Add the bonus XP
          overdriveQuestionsLeft--;
        }

        // 2. Handle Daily Points
        const pointsToAdd = difficulty === 'Easy' ? 1 : 3;
        const oldPoints = dailyPoints;
        dailyPoints += pointsToAdd;

        // Check for Daily Goal Completion (3 points)
        if (oldPoints < 3 && dailyPoints >= 3) {
          updatedXp += 500; // Daily Reward
          streak++;
        }

        // 3. Check for 10k Milestone Overdrive Trigger
        const oldMilestone = Math.floor((currentProfile.globalXp || 0) / 10000);
        const newMilestone = Math.floor(updatedXp / 10000);
        if (newMilestone > oldMilestone) {
          overdriveQuestionsLeft = 3;
          overdriveSessionsCompleted++;
        }
      }

      await setDoc(studentRef, {
        name,
        globalXp: updatedXp,
        languageMastery,
        completedSets: Array.from(new Set(completedSets)),
        dailyPoints,
        streak,
        overdriveQuestionsLeft,
        overdriveSessionsCompleted,
        lastDailyReset
      }, { merge: true });
    } catch (error) {
      console.warn(`Firestore Warning [updateGlobalStudentStats]:`, error);
    }
  }
}

export const storageService = new StorageService();
