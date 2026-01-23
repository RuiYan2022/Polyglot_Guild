
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from './services/firebase';
import { doc, getDoc } from "firebase/firestore";
import Layout from './components/Layout';
import { TeacherAuth, StudentAuth, WaitingRoom } from './components/Auth';
import TeacherDashboard from './components/TeacherDashboard';
import StudentPortal from './components/StudentPortal';
import { Role } from './types';
import { ICONS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'landing' | 'teacher_auth' | 'student_auth'>('landing');
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
          setUser(null);
        }
      } catch (err: any) {
        setAuthError("Database connection failed.");
      } finally {
        setIsInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 overflow-y-auto">
        {view === 'landing' ? (
          <div className="max-w-4xl w-full text-center space-y-12 animate-in fade-in zoom-in duration-700 py-12">
            <div className="space-y-4">
              <div className="inline-block p-4 bg-indigo-600 rounded-3xl text-white mb-6 shadow-2xl shadow-indigo-200">
                <ICONS.Code className="w-16 h-16" />
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight">
                Scale Your <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent italic">Coding Academy</span>
              </h1>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Connect your classroom to the cloud. Build multi-language coding curricula powered by Firebase and Gemini AI.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button onClick={() => setView('teacher_auth')} className="group flex-1 max-w-xs bg-white p-8 rounded-3xl border border-slate-200 shadow-xl hover:shadow-2xl hover:border-indigo-500 transition-all text-left">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ICONS.Users className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Guild Master</h3>
                <p className="text-slate-500 mt-2">Manage your school, create mission packs, and track student growth.</p>
                <div className="mt-6 flex items-center gap-2 text-indigo-600 font-bold uppercase text-xs tracking-widest">Teacher Access →</div>
              </button>

              <button onClick={() => setView('student_auth')} className="group flex-1 max-w-xs bg-white p-8 rounded-3xl border border-slate-200 shadow-xl hover:shadow-2xl hover:border-violet-500 transition-all text-left">
                <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl w-fit mb-4 group-hover:bg-violet-600 group-hover:text-white transition-all">
                  <ICONS.Terminal className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Explorer</h3>
                <p className="text-slate-500 mt-2">Enter your class code to start your training and gain XP.</p>
                <div className="mt-6 flex items-center gap-2 text-violet-600 font-bold uppercase text-xs tracking-widest">Student Portal →</div>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center py-12">
             <button onClick={() => setView('landing')} className="mb-8 text-slate-400 hover:text-indigo-600 flex items-center gap-2 font-bold">← Back to Home</button>
             {view === 'teacher_auth' ? <TeacherAuth onLogin={setUser} /> : <StudentAuth onLogin={setUser} />}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;