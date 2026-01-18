
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth, db } from '../services/firebase';
import { doc, getDoc } from "firebase/firestore";
import { Role, TeacherProfile } from '../types';
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
  const [name, setName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedCode = localStorage.getItem('remembered_class_code');
    if (savedCode) setClassCode(savedCode);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Find the class by the provided code
      const targetClass = await storageService.getClassByCode(classCode.trim());
      if (!targetClass) throw new Error("Class not found. Verify your Class Code.");
      
      // Get the teacher associated with this class
      const teacherRef = doc(db, "teachers", targetClass.teacherId);
      const teacherSnap = await getDoc(teacherRef);
      const teacher = teacherSnap.data();
      if (!teacher) throw new Error("Academy records missing for this class.");

      // Verify the mission passcode exists under this teacher
      const set = await storageService.getQuestionSetByPortal(targetClass.teacherId, passcode.trim());
      if (!set) throw new Error("Mission Pack not found. Verify your Mission Pass.");

      localStorage.setItem('remembered_class_code', classCode.trim().toUpperCase());

      onLogin({
        name,
        role: Role.STUDENT,
        teacher: { ...teacher, uid: targetClass.teacherId },
        classId: targetClass.id,
        className: targetClass.name,
        activeSet: set
      });
    } catch (error: any) {
      setErrorMsg(error.message || 'Access denied.');
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
        <h2 className="text-2xl font-bold text-slate-800">Student Portal</h2>
        <p className="text-slate-500 mt-2">Enter your class code to start training.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-center animate-in slide-in-from-top-2">
          <p className="text-xs font-bold text-red-800">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          required
          placeholder="Explorer Name" 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
          value={name} onChange={e => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <input 
              required
              placeholder="Class Code" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all uppercase"
              value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())}
            />
            <p className="absolute -bottom-5 left-1 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">e.g. PY-101</p>
          </div>
          <div className="relative">
            <input 
              required
              placeholder="Mission Pass" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all uppercase"
              value={passcode} onChange={e => setPasscode(e.target.value.toUpperCase())}
            />
            <p className="absolute -bottom-5 left-1 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Portal Passcode</p>
          </div>
        </div>
        <button 
          disabled={isLoading}
          type="submit"
          className="w-full mt-4 py-4 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all active:scale-95 disabled:bg-slate-300"
        >
          {isLoading ? 'Scanning...' : 'Enter Mission Portal'}
        </button>
      </form>
    </div>
  );
};