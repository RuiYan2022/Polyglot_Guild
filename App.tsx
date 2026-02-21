
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from './services/firebase';
import { doc, getDoc } from "firebase/firestore";
import Layout from './components/Layout';
import { TeacherAuth, StudentAuth, TAAuth, WaitingRoom } from './components/Auth';
import TeacherDashboard from './components/TeacherDashboard';
import StudentPortal from './components/StudentPortal';
import WardenDashboard from './components/WardenDashboard';
import { Role } from './types';
import { ICONS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'landing' | 'teacher_auth' | 'student_auth' | 'ta_auth'>('landing');
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError(null);
      try {
        if (firebaseUser) {
          const teacherRef = doc(db, "teachers", firebaseUser.uid);
          const teacherSnap = await getDoc(teacherRef);
          
          if (teacherSnap.exists()) {
            setUser({ ...teacherSnap.data(), role: Role.TEACHER });
          } else {
            const studentRef = doc(db, "students", firebaseUser.uid);
            const studentSnap = await getDoc(studentRef);
            
            if (studentSnap.exists()) {
              setUser({ ...studentSnap.data(), role: Role.STUDENT });
            } else {
              setAuthError("Account found, but profile data is missing.");
              setUser(null); 
            }
          }
        } else {
          // Check if there's a TA session in progress (stored in state only for now)
          if (user?.role !== Role.TA) {
            setUser(null);
          }
        }
      } catch (err: any) {
        setAuthError("Database connection failed.");
      } finally {
        setIsInitializing(false);
      }
    });

    return () => unsubscribe();
  }, [user?.role]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) {}
    setUser(null);
    setAuthError(null);
    setView('landing');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-indigo-400 font-bold tracking-widest uppercase text-xs">Synchronizing Guild Records...</p>
        </div>
      </div>
    );
  }

  // TA / Warden View
  if (user?.role === Role.TA) {
    return (
      <Layout user={user} onLogout={handleLogout}>
        <WardenDashboard teacher={user.teacher} activeClass={user.class} />
      </Layout>
    );
  }

  if (user?.role === Role.STUDENT && user.status === 'approved') {
    return (
      <Layout user={user} onLogout={handleLogout}>
        <StudentPortal profile={user} onLogout={handleLogout} />
      </Layout>
    );
  }

  if (user?.role === Role.STUDENT && user.status !== 'approved') {
    return (
      <Layout onLogout={handleLogout}>
        <div className="flex-1 flex items-center justify-center p-6">
          <WaitingRoom profile={user} onSignOut={handleLogout} />
        </div>
      </Layout>
    );
  }

  if (user?.role === Role.TEACHER) {
    return (
      <Layout user={user} onLogout={handleLogout}>
        <TeacherDashboard profile={user} />
      </Layout>
    );
  }

  return (
    <Layout onLogout={handleLogout}>
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors duration-300">
        {view === 'landing' ? (
          <div className="max-w-6xl w-full text-center space-y-12 animate-in fade-in zoom-in duration-700 py-12">
            <div className="space-y-4">
              <div className="inline-block p-4 bg-indigo-600 rounded-3xl text-white mb-6 shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/20">
                <ICONS.Code className="w-16 h-16" />
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight">
                Scale Your <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent italic">Coding Academy</span>
              </h1>
              <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                Connect your classroom to the cloud. Build multi-language coding curricula powered by Gemini AI.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button onClick={() => setView('teacher_auth')} className="group flex-1 max-w-xs bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl hover:shadow-2xl hover:border-indigo-500 transition-all text-left">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ICONS.Users className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Guild Master</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Manage your school, create mission packs, and track student growth.</p>
                <div className="mt-6 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-xs tracking-widest">Teacher Access →</div>
              </button>

              <button onClick={() => setView('ta_auth')} className="group flex-1 max-w-xs bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl hover:shadow-2xl hover:border-emerald-500 transition-all text-left">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <ICONS.Book className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Class Warden</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Monitor live student progress and provide tactical assistance.</p>
                <div className="mt-6 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-xs tracking-widest">TA Login →</div>
              </button>

              <button onClick={() => setView('student_auth')} className="group flex-1 max-w-xs bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl hover:shadow-2xl hover:border-violet-500 transition-all text-left">
                <div className="p-3 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-2xl w-fit mb-4 group-hover:bg-violet-600 group-hover:text-white transition-all">
                  <ICONS.Terminal className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Explorer</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Enter your class code to start your training and gain XP.</p>
                <div className="mt-6 flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold uppercase text-xs tracking-widest">Student Portal →</div>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center py-12">
             <button onClick={() => setView('landing')} className="mb-8 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">← Return to Landing</button>
             {view === 'teacher_auth' ? <TeacherAuth onLogin={setUser} /> : view === 'ta_auth' ? <TAAuth onLogin={setUser} /> : <StudentAuth onLogin={setUser} />}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
