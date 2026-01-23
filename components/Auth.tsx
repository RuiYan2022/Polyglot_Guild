
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
    <div className="max-w-md w-full mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-block p-3 bg-indigo-50 rounded-2xl mb-4">
          <ICONS.Users className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">{isLogin ? 'Teacher Login' : 'Create Guild Master Account'}</h2>
        <p className="text-slate-500 mt-2">Manage your academy and track students.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
          <div className="text-red-500 mt-0.5">
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          </div>
          <div className="flex-1 text-xs font-bold text-red-800 leading-tight">{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <input 
              required
              placeholder="Full Name" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={name} onChange={e => setName(e.target.value)}
            />
            {/* Fix: Passed a function to handle the onChange event correctly and capture the event 'e' */}
            <input 
              required
              placeholder="School/Academy Name" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={school} onChange={e => setSchool(e.target.value)}
            />
          </>
        )}
        <input 
          required
          type="email"
          placeholder="Work Email" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <div className="relative">
          <input 
            required
            type={showPassword ? "text" : "password"}
            placeholder="Password" 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
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
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-300"
        >
          {isLoading ? 'Processing...' : (isLogin ? 'Enter Academy' : 'Initialize Guild')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          disabled={isLoading}
          onClick={() => { setIsLogin(!isLogin); setErrorMsg(null); }}
          className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
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
        // --- STUDENT LOGIN ---
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const profile = await storageService.getStudentProfile(userCredential.user.uid);
        
        if (!profile) throw new Error("Student profile records not found.");
        onLogin({ ...profile, role: Role.STUDENT });
      } else {
        // --- STUDENT REGISTRATION ---
        // 1. Validate Master Key
        const teacher = await storageService.getTeacherByCode(masterKey.trim());
        if (!teacher) throw new Error("Invalid Master Key. Please check with your teacher.");

        // 2. Validate Class Code
        const targetClass = await storageService.getClassByCode(classCode.trim());
        if (!targetClass || targetClass.teacherId !== teacher.uid) {
          throw new Error("Class Code not found in this Academy.");
        }

        // 3. Create Auth Account
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        
        // 4. Create Student Profile
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
          unlockedSets: []
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
    <div className="max-w-md w-full mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-block p-3 bg-violet-50 rounded-2xl mb-4">
          <ICONS.Terminal className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">
          {isLogin ? 'Student Login' : 'Student Registration'}
        </h2>
        <p className="text-slate-500 mt-2">
          {isLogin ? 'Enter your credentials to continue training.' : 'Create an account to join an Academy.'}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-center animate-in slide-in-from-top-2">
          <p className="text-xs font-bold text-red-800">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {!isLogin && (
          <>
            <input 
              required
              placeholder="Your Full Name" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
              value={name} onChange={e => setName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
               <input 
                 required
                 placeholder="Master Key" 
                 className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all uppercase"
                 value={masterKey} onChange={e => setMasterKey(e.target.value.toUpperCase())}
               />
               <input 
                 required
                 placeholder="Class Code" 
                 className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all uppercase"
                 value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())}
               />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter px-1">Check with your Teacher for keys.</p>
          </>
        )}
        
        <input 
          required
          type="email"
          placeholder="Email Address" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <input 
          required
          type="password"
          placeholder="Password" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
          value={password} onChange={e => setPassword(e.target.value)}
        />

        <button 
          disabled={isLoading}
          type="submit"
          className="w-full mt-4 py-4 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all active:scale-95 disabled:bg-slate-300"
        >
          {isLoading ? 'Scanning...' : (isLogin ? 'Enter Portal' : 'Register for Academy')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          disabled={isLoading}
          onClick={() => { setIsLogin(!isLogin); setErrorMsg(null); }}
          className="text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
};

export const WaitingRoom: React.FC<{ profile: StudentProfile; onSignOut: () => void }> = ({ profile, onSignOut }) => {
  return (
    <div className="max-w-lg w-full mx-auto bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mb-10 inline-block">
        <div className="absolute inset-0 bg-violet-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
        <div className="relative bg-violet-50 p-8 rounded-full border-2 border-violet-100">
          <svg className="w-16 h-16 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>
      
      <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Entrance Requested</h2>
      <p className="text-slate-500 text-lg leading-relaxed mb-8">
        Welcome, <span className="text-slate-900 font-bold">{profile.name}</span>. Your request to join the Academy has been sent. Please wait for your <span className="text-violet-600 font-black">Guild Master</span> to grant clearance.
      </p>

      <div className="flex flex-col items-center gap-6 mb-12">
        <div className="flex items-center gap-3 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
          <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Pending Verification</span>
        </div>
      </div>

      <button 
        onClick={onSignOut}
        className="text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors border-b border-transparent hover:border-slate-300"
      >
        Cancel Request & Sign Out
      </button>
    </div>
  );
};