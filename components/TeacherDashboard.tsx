
import React, { useState, useEffect } from 'react';
import { TeacherProfile, QuestionSet, StudentProgress, ClassProfile } from '../types';
import { storageService } from '../services/storageService';
import { ICONS } from '../constants';
import MissionLab from './MissionLab';
import Library from './Library';

interface TeacherDashboardProps {
  profile: TeacherProfile;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'missions' | 'students' | 'classes' | 'library'>('missions');
  const [missions, setMissions] = useState<QuestionSet[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [classes, setClasses] = useState<ClassProfile[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  
  const [showLab, setShowLab] = useState(false);
  const [activeSetForEdit, setActiveSetForEdit] = useState<QuestionSet | undefined>(undefined);
  
  const [newClassName, setNewClassName] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const m = await storageService.getQuestionSets(profile.uid);
        const p = await storageService.getProgress(profile.uid);
        const c = await storageService.getClasses(profile.uid);
        setMissions(m);
        setProgress(p);
        setClasses(c);
      } catch (err: any) {
        setError(err.message || "Failed to sync with the Academy Records.");
      }
    };
    loadData();
  }, [profile.uid, showLab, isCreatingClass]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    setIsCreatingClass(true);
    try {
      const code = `${newClassName.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`;
      const newClass: ClassProfile = {
        id: `class_${Date.now()}`,
        teacherId: profile.uid,
        name: newClassName.trim(),
        code,
        createdAt: Date.now()
      };
      await storageService.saveClass(newClass);
      setNewClassName('');
    } catch (err: any) {
      alert(err.message || "Could not create classroom.");
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (window.confirm("Are you sure? This will remove the class record (students progress remains).")) {
      try {
        await storageService.deleteClass(id);
        setClasses(classes.filter(c => c.id !== id));
      } catch (err: any) {
        alert(err.message || "Could not delete classroom.");
      }
    }
  };

  const handleSaveSet = async (set: QuestionSet) => {
    try {
      await storageService.saveQuestionSet(set);
      setShowLab(false);
      setActiveSetForEdit(undefined);
    } catch (err: any) {
      alert(err.message || "Failed to save changes.");
    }
  };

  const filteredProgress = selectedClassId === 'all' 
    ? progress 
    : progress.filter(p => p.classId === selectedClassId);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
             <div className="bg-red-100 p-2 rounded-lg text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <div>
                <p className="text-sm font-bold text-red-800">Intelligence Sync Error</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
             </div>
          </div>
        )}

        {/* Header Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{profile.schoolName}</h2>
            <p className="text-slate-500">Guild Master: {profile.name}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master Key</p>
              <p className="text-2xl font-mono font-black text-slate-300">{profile.academyCode}</p>
            </div>
            <button 
              onClick={() => { setShowLab(true); setActiveSetForEdit(undefined); }}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <ICONS.Plus className="w-5 h-5" /> New Mission Pack
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-8 overflow-x-auto">
          {[
            { id: 'missions', label: 'Missions', icon: ICONS.Terminal },
            { id: 'classes', label: 'Classrooms', icon: ICONS.Book },
            { id: 'students', label: 'Intelligence', icon: ICONS.Users },
            { id: 'library', label: 'Global Library', icon: ICONS.Globe }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setShowLab(false); }}
              className={`flex items-center gap-2 py-4 px-2 font-bold transition-all relative whitespace-nowrap ${
                activeTab === tab.id && !showLab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {activeTab === tab.id && !showLab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {showLab ? (
            <MissionLab 
              teacherId={profile.uid} 
              authorName={profile.name}
              initialSet={activeSetForEdit}
              onSave={handleSaveSet} 
              onCancel={() => { setShowLab(false); setActiveSetForEdit(undefined); }} 
            />
          ) : activeTab === 'classes' ? (
            <div className="space-y-6">
               <div className="flex flex-col sm:flex-row gap-4 items-end bg-slate-100 p-6 rounded-2xl border border-slate-200">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Create New Classroom</label>
                    <input 
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      placeholder="e.g. Computer Science Period 3"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button 
                    onClick={handleCreateClass}
                    disabled={isCreatingClass || !newClassName.trim()}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 shadow-lg shadow-indigo-100 transition-all"
                  >
                    {isCreatingClass ? 'Initializing...' : 'Add Classroom'}
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classes.map(c => (
                    <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col group">
                       <div className="flex justify-between items-start mb-4">
                          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                             <ICONS.Book className="w-6 h-6" />
                          </div>
                          <button onClick={() => handleDeleteClass(c.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                       </div>
                       <h3 className="text-xl font-bold text-slate-800 mb-1">{c.name}</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Class Code</p>
                       <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between mb-4">
                          <span className="font-mono text-2xl font-black text-indigo-600">{c.code}</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(c.code)}
                            className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600"
                          >
                            Copy
                          </button>
                       </div>
                       <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between text-xs text-slate-400 font-bold uppercase">
                          <span>Students</span>
                          <span className="text-slate-700">{progress.filter(p => p.classId === c.id).length}</span>
                       </div>
                    </div>
                  ))}
                  {classes.length === 0 && !error && (
                    <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                       <p className="text-sm">No classrooms detected in this academy.</p>
                    </div>
                  )}
               </div>
            </div>
          ) : activeTab === 'missions' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {missions.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-400">
                  <ICONS.Terminal className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No mission packs created yet. Launch your first one!</p>
                </div>
              ) : (
                missions.map(set => (
                  <div key={set.id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-sm group relative flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-full tracking-wider">{set.language}</span>
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${set.isPublic ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        {set.isPublic ? 'Global' : 'Private'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{set.title}</h3>
                    <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow">{set.description}</p>
                    
                    <div className="flex justify-between items-center py-4 border-t border-slate-50 mb-4">
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Mission Pass</p>
                        <p className="font-mono text-indigo-500 font-bold">{set.passcode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Missions</p>
                        <p className="font-bold text-slate-700">{set.questions.length}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => { setActiveSetForEdit(set); setShowLab(true); }}
                      className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Edit Pack
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'students' ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Filter Intelligence By Class:</span>
                 <select 
                   value={selectedClassId}
                   onChange={e => setSelectedClassId(e.target.value)}
                   className="px-4 py-2 bg-slate-100 border-none rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                    <option value="all">Entire Academy</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                 </select>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Explorer Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Mission Pack</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Mastery</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Last Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProgress.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-slate-400">No active students reported in this view.</td>
                      </tr>
                    ) : (
                      filteredProgress.map(p => {
                        const missionSet = missions.find(m => m.id === p.questionSetId);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700">{p.studentName}</td>
                            <td className="px-6 py-4 text-slate-500 font-medium">{missionSet?.title || 'Unknown Mission'}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]" 
                                    style={{ width: `${(p.completedQuestions.length / (missionSet?.questions.length || 1)) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-black text-slate-600">{p.completedQuestions.length}/{missionSet?.questions.length}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-400 font-bold uppercase tracking-tighter">
                              {new Date(p.lastActive).toLocaleDateString()}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Library currentTeacherId={profile.uid} onImport={() => setActiveTab('missions')} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;