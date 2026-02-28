
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth, db } from '../services/firebase';
import { doc, getDoc } from "firebase/firestore";
import { Role, TeacherProfile, StudentProfile } from '../types';
import { storageService } from '../services/storageService';
import { ICONS } from '../constants';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const TAAuth: React.FC<AuthProps> = ({ onLogin }) => {
  const [academyCode, setAcademyCode] = useState('');
  const [classCode, setClassCode] = useState('');
  const [taKey, setTaKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const session = await storageService.verifyTAAccess(academyCode, classCode, taKey);
      if (!session) {
        throw new Error("Access Denied: Invalid Academy, Class, or Warden Key.");
      }

      onLogin({
        role: Role.TA,
        name: `Warden of ${session.class.name}`,
        teacher: session.teacher,
        class: session.class
      });
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-block p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl mb-4">
          <ICONS.Book className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Warden Entry</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Access classroom intelligence with authorized keys.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-center">
          <p className="text-xs font-bold text-red-800 dark:text-red-400">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <input 
          required
          placeholder="Teacher Academy Code" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase placeholder:text-slate-400 dark:placeholder:text-slate-600"
          value={academyCode} onChange={e => setAcademyCode(e.target.value.toUpperCase())}
        />
        <input 
          required
          placeholder="Class Code" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase placeholder:text-slate-400 dark:placeholder:text-slate-600"
          value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())}
        />
        <input 
          required
          type="password"
          placeholder="TA Access Key" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase placeholder:text-slate-400 dark:placeholder:text-slate-600"
          value={taKey} onChange={e => setTaKey(e.target.value.toUpperCase())}
        />

        <button 
          disabled={isLoading}
          type="submit"
          className="w-full mt-4 py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-800"
        >
          {isLoading ? 'Verifying...' : 'Establish Connection'}
        </button>
      </form>
    </div>
  );
};

export const TeacherAuth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    
    const cleanEmail = email.trim();

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const teacherRef = doc(db, "teachers", userCredential.user.uid);
        const teacherSnap = await getDoc(teacherRef);
        
        if (!teacherSnap.exists()) {
          throw new Error("ACCOUNT_ORPHANED: Profile data missing.");
        }
        
        onLogin({ ...teacherSnap.data(), role: Role.TEACHER });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const academyCode = `${name.split(' ')[0].toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`;
        const newTeacher: TeacherProfile = {
          uid: userCredential.user.uid,
          name,
          email: cleanEmail,
          schoolName: school,
          academyCode
        };
        await storageService.saveTeacher(newTeacher);
        onLogin({ ...newTeacher, role: Role.TEACHER });
      }
    } catch (error: any) {
      console.error("Auth Error:", error.code || error.message);
      setErrorMsg(error.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-block p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl mb-4">
          <ICONS.Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isLogin ? 'Teacher Login' : 'Create Guild Master Account'}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your academy and track students.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
          <div className="text-red-500 mt-0.5">
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          </div>
          <div className="flex-1 text-xs font-bold text-red-800 dark:text-red-400 leading-tight">{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <input 
              required
              placeholder="Full Name" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
              value={name} onChange={e => setName(e.target.value)}
            />
            <input 
              required
              placeholder="School/Academy Name" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
              value={school} onChange={e => setSchool(e.target.value)}
            />
          </>
        )}
        <input 
          required
          type="email"
          placeholder="Work Email" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <div className="relative">
          <input 
            required
            type={showPassword ? "text" : "password"}
            placeholder="Password" 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.888 9.888L14 14m-4-4L6.477 6.477M21 12c0 1.268-.235 2.483-.662 3.606m-1.554-1.554a9.03 9.03 0 00-1.566-2.052c-.544-.544-1.154-1.022-1.815-1.428m-2.585-1.39A9.956 9.956 0 0012 5c-4.478 0-8.268-2.943-9.543 7a9.97 9.97 0 001.563 3.029l1.62-1.62" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
        <button 
          disabled={isLoading}
          type="submit"
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-800"
        >
          {isLoading ? 'Processing...' : (isLogin ? 'Enter Academy' : 'Initialize Guild')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          disabled={isLoading}
          onClick={() => { setIsLogin(!isLogin); setErrorMsg(null); }}
          className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
};

export const StudentAuth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classCode, setClassCode] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const profile = await storageService.getStudentProfile(userCredential.user.uid);
        
        if (!profile) throw new Error("Student profile records not found.");
        onLogin({ ...profile, role: Role.STUDENT });
      } else {
        const teacher = await storageService.getTeacherByCode(masterKey.trim());
        if (!teacher) throw new Error("Invalid Master Key. Please check with your teacher.");

        const targetClass = await storageService.getClassByCode(classCode.trim());
        if (!targetClass || targetClass.teacherId !== teacher.uid) {
          throw new Error("Class Code not found in this Academy.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        
        const newStudent: StudentProfile = {
          uid: userCredential.user.uid,
          name,
          email: email.trim(),
          globalXp: 0,
          languageMastery: {},
          completedSets: [],
          status: 'pending',
          classId: targetClass.id,
          masterKey: teacher.uid,
          unlockedSets: [],
          dailyPoints: 0,
          lastDailyReset: Date.now(),
          streak: 0,
          overdriveQuestionsLeft: 0,
          overdriveSessionsCompleted: 0
        };
        
        await storageService.saveStudentProfile(newStudent);
        onLogin({ ...newStudent, role: Role.STUDENT });
      }
    } catch (error: any) {
      console.error("Student Auth Error:", error);
      setErrorMsg(error.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-block p-3 bg-violet-50 dark:bg-violet-900/30 rounded-2xl mb-4">
          <ICONS.Terminal className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          {isLogin ? 'Student Login' : 'Student Registration'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          {isLogin ? 'Enter your credentials to continue training.' : 'Create an account to join an Academy.'}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-center animate-in slide-in-from-top-2">
          <p className="text-xs font-bold text-red-800 dark:text-red-400">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {!isLogin && (
          <>
            <input 
              required
              placeholder="Your Full Name" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
              value={name} onChange={e => setName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
               <input 
                 required
                 placeholder="Master Key" 
                 className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all uppercase placeholder:text-slate-400 dark:placeholder:text-slate-600"
                 value={masterKey} onChange={e => setMasterKey(e.target.value.toUpperCase())}
               />
               <input 
                 required
                 placeholder="Class Code" 
                 className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all uppercase placeholder:text-slate-400 dark:placeholder:text-slate-600"
                 value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())}
               />
            </div>
          </>
        )}
        
        <input 
          required
          type="email"
          placeholder="Email Address" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <input 
          required
          type="password"
          placeholder="Password" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
          value={password} onChange={e => setPassword(e.target.value)}
        />

        <button 
          disabled={isLoading}
          type="submit"
          className="w-full mt-4 py-4 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-100 dark:shadow-violet-900/20 hover:bg-violet-700 transition-all active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-800"
        >
          {isLoading ? 'Scanning...' : (isLogin ? 'Enter Portal' : 'Register for Academy')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          disabled={isLoading}
          onClick={() => { setIsLogin(!isLogin); setErrorMsg(null); }}
          className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
};

export const WaitingRoom: React.FC<{ profile: StudentProfile; onSignOut: () => void }> = ({ profile, onSignOut }) => {
  return (
    <div className="max-w-lg w-full mx-auto bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/5 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mb-10 inline-block">
        <div className="absolute inset-0 bg-violet-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
        <div className="relative bg-violet-50 dark:bg-violet-900/30 p-8 rounded-full border-2 border-violet-100 dark:border-violet-900/50">
          <svg className="w-16 h-16 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>
      
      <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">Entrance Requested</h2>
      <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-8">
        Welcome, <span className="text-slate-900 dark:text-slate-200 font-bold">{profile.name}</span>. Your request to join the Academy has been sent. Please wait for your <span className="text-violet-600 dark:text-violet-400 font-black">Guild Master</span> to grant clearance.
      </p>

      <button 
        onClick={onSignOut}
        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-sm transition-colors border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700"
      >
        Cancel Request & Sign Out
      </button>
    </div>
  );
};
