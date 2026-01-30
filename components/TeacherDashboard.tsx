
import React, { useState, useEffect } from 'react';
import { TeacherProfile, QuestionSet, StudentProgress, ClassProfile, StudentProfile } from '../types';
import { storageService } from '../services/storageService';
import { ICONS } from '../constants';
import MissionLab from './MissionLab';
import Library from './Library';

interface TeacherDashboardProps {
  profile: TeacherProfile;
}

type SortOption = 'xp-desc' | 'xp-asc' | 'name-asc';

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'missions' | 'students' | 'classes' | 'library' | 'analytics'>('missions');
  const [missions, setMissions] = useState<QuestionSet[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [classes, setClasses] = useState<ClassProfile[]>([]);
  const [pendingStudents, setPendingStudents] = useState<StudentProfile[]>([]);
  const [approvedStudents, setApprovedStudents] = useState<StudentProfile[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedMissionId, setSelectedMissionId] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOption>('xp-desc');
  const [error, setError] = useState<string | null>(null);
  
  const [showLab, setShowLab] = useState(false);
  const [activeSetForEdit, setActiveSetForEdit] = useState<QuestionSet | undefined>(undefined);
  
  const [newClassName, setNewClassName] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [m, p, c, pending, approved] = await Promise.all([
        storageService.getQuestionSets(profile.uid),
        storageService.getProgress(profile.uid),
        storageService.getClasses(profile.uid),
        storageService.getPendingStudents(profile.uid),
        storageService.getApprovedStudents(profile.uid)
      ]);
      setMissions(m);
      setProgress(p);
      setClasses(c);
      setPendingStudents(pending);
      setApprovedStudents(approved);
    } catch (err: any) {
      setError(err.message || "Failed to sync with the Academy Records.");
    }
  };

  useEffect(() => {
    loadData();
  }, [profile.uid, showLab, isCreatingClass]);

  const handleApprove = async (studentUid: string) => {
    setIsProcessingApproval(studentUid);
    try {
      await storageService.updateStudentStatus(studentUid, 'approved');
      await loadData();
    } catch (err: any) {
      alert("Clearance failed: " + err.message);
    } finally {
      setIsProcessingApproval(null);
    }
  };

  const handleDeny = async (studentUid: string) => {
    if (!window.confirm("Deny entrance? This student will not be able to join your academy.")) return;
    setIsProcessingApproval(studentUid);
    try {
      await storageService.updateStudentStatus(studentUid, 'denied');
      await loadData();
    } catch (err: any) {
      alert("Action failed: " + err.message);
    } finally {
      setIsProcessingApproval(null);
    }
  };

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

  const handleDeleteSet = async (setId: string) => {
    try {
      await storageService.deleteQuestionSet(setId);
      setMissions(missions.filter(m => m.id !== setId));
      setDeletingSetId(null);
    } catch (err: any) {
      alert("Failed to delete mission pack: " + err.message);
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

  // Logic for filtering and sorting
  const getProcessedRoster = () => {
    let list = [...approvedStudents];

    // Filter by Class
    if (selectedClassId !== 'all') {
      list = list.filter(s => s.classId === selectedClassId);
    }

    // Filter by Mission Intelligence (Only show students who have engaged with this mission)
    if (selectedMissionId !== 'all') {
      list = list.filter(student => 
        progress.some(p => p.studentUid === student.uid && p.questionSetId === selectedMissionId)
      );
    }

    // Apply Sorting
    list.sort((a, b) => {
      // Logic for sorting by dynamic XP
      const getXp = (s: StudentProfile) => {
        if (selectedMissionId === 'all') return s.globalXp || 0;
        const p = progress.find(p => p.studentUid === s.uid && p.questionSetId === selectedMissionId);
        return p ? Object.values(p.scores || {}).reduce((acc: number, v: number) => acc + (v || 0), 0) : 0;
      };

      if (sortOrder === 'xp-desc') return getXp(b) - getXp(a);
      if (sortOrder === 'xp-asc') return getXp(a) - getXp(b);
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  };

  const filteredRoster = getProcessedRoster();

  const getAnalytics = () => {
    const totalXp = approvedStudents.reduce((acc: number, s) => acc + (s.globalXp || 0), 0);
    const avgXp = approvedStudents.length > 0 ? Math.floor(totalXp / approvedStudents.length) : 0;
    
    const packStats = missions.map(set => {
      const studentCount = approvedStudents.length;
      const completedCount = progress.filter(p => p.questionSetId === set.id && p.completedQuestions.length === set.questions.length).length;
      const completionRate = studentCount > 0 ? Math.round((completedCount / studentCount) * 100) : 0;
      return { ...set, completionRate };
    }).sort((a, b) => a.completionRate - b.completionRate);

    return { totalXp, avgXp, packStats };
  };

  const { totalXp, avgXp, packStats } = getAnalytics();

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50">
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
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{profile.schoolName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <p className="text-slate-500 font-medium">Academy Active • {profile.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-8 relative z-10">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Academy Master Key</p>
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigator.clipboard.writeText(profile.academyCode)}>
                <p className="text-3xl font-mono font-black text-indigo-600 tracking-tighter">{profile.academyCode}</p>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => { setShowLab(true); setActiveSetForEdit(undefined); }}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
            >
              <ICONS.Plus className="w-5 h-5" /> New Mission Pack
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-10 overflow-x-auto scrollbar-hide">
          {[
            { id: 'missions', label: 'Mission Board', icon: ICONS.Terminal },
            { id: 'classes', label: 'Classrooms', icon: ICONS.Book },
            { id: 'students', label: 'Intelligence', icon: ICONS.Users, count: pendingStudents.length },
            { id: 'analytics', label: 'Analytics Hub', icon: ICONS.Trophy },
            { id: 'library', label: 'Global Library', icon: ICONS.Globe }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setShowLab(false); }}
              className={`flex items-center gap-3 py-5 px-1 font-black transition-all relative whitespace-nowrap text-sm tracking-tight ${
                activeTab === tab.id && !showLab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && !showLab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="mt-2">
          {showLab ? (
            <MissionLab 
              teacherId={profile.uid} 
              authorName={profile.name}
              initialSet={activeSetForEdit}
              onSave={handleSaveSet} 
              onCancel={() => { setShowLab(false); setActiveSetForEdit(undefined); }} 
            />
          ) : activeTab === 'analytics' ? (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* Stat Cards */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Explorers</p>
                     <p className="text-4xl font-black text-slate-900">{approvedStudents.length}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total XP Generated</p>
                     <p className="text-4xl font-black text-indigo-600">{totalXp.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Explorer XP</p>
                     <p className="text-4xl font-black text-violet-600">{avgXp.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mission Completion</p>
                     <p className="text-4xl font-black text-green-600">
                       {packStats.length > 0 ? Math.round(packStats.reduce((acc: number, set) => acc + set.completionRate, 0) / packStats.length) : 0}%
                     </p>
                  </div>
               </div>

               {/* Friction Points Table */}
               <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-slate-800">Mission Friction Points</h3>
                    <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase">Struggle Analysis</span>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mission Pack</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Completion Rate</th>
                        <th className="px-8 py-4 text-[10px) font-black text-slate-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {packStats.map(set => (
                        <tr key={set.id}>
                          <td className="px-8 py-5 font-bold text-slate-800">{set.title}</td>
                          <td className="px-8 py-5">
                             <span className="text-xs font-black text-indigo-400 uppercase">{set.language}</span>
                          </td>
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-3">
                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                   <div className={`h-full ${set.completionRate < 30 ? 'bg-red-500' : set.completionRate < 70 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${set.completionRate}%` }}></div>
                                </div>
                                <span className="text-sm font-black text-slate-900">{set.completionRate}%</span>
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             {set.completionRate < 30 ? (
                               <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter bg-red-50 px-2 py-1 rounded">High Friction</span>
                             ) : (
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Normal</span>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          ) : activeTab === 'students' ? (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* CLEARANCE REQUESTS */}
              {pendingStudents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    Clearance Requests
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingStudents.map(student => {
                      const targetClass = classes.find(c => c.id === student.classId);
                      return (
                        <div key={student.uid} className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col hover:border-amber-400 transition-all group">
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-black text-xs border border-amber-100">
                                  {student.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-black text-slate-800 leading-none">{student.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-1 truncate w-32">{student.email}</p>
                                </div>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded">Pending</span>
                           </div>
                           <div className="mb-4 flex-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Class</p>
                              <p className="text-sm font-bold text-slate-700">{targetClass?.name || 'Unknown Class'}</p>
                           </div>
                           <div className="flex gap-2 pt-4 border-t border-slate-50">
                              <button 
                                type="button"
                                onClick={() => handleApprove(student.uid)}
                                disabled={isProcessingApproval === student.uid}
                                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {isProcessingApproval === student.uid ? '...' : 'Approve'}
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeny(student.uid)}
                                disabled={isProcessingApproval === student.uid}
                                className="px-4 py-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl text-xs font-black hover:text-red-600 hover:border-red-200 transition-all"
                              >
                                Deny
                              </button>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ROSTER */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Academy Roster</h3>
                  
                  {/* Advanced Filters and Sorts */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Class Filter */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Class:</span>
                      <select 
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="bg-transparent border-none text-xs font-black text-slate-700 outline-none focus:ring-0"
                      >
                          <option value="all">Entire Academy</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                    </div>

                    {/* Mission Intelligence Filter */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Mission:</span>
                      <select 
                        value={selectedMissionId}
                        onChange={e => setSelectedMissionId(e.target.value)}
                        className="bg-transparent border-none text-xs font-black text-slate-700 outline-none focus:ring-0 max-w-[120px]"
                      >
                          <option value="all">Any Interaction</option>
                          {missions.map(m => (
                            <option key={m.id} value={m.id}>{m.title}</option>
                          ))}
                      </select>
                    </div>

                    {/* XP Sort Dropdown */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Order:</span>
                      <select 
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value as SortOption)}
                        className="bg-transparent border-none text-xs font-black text-slate-700 outline-none focus:ring-0"
                      >
                          <option value="xp-desc">XP (High to Low)</option>
                          <option value="xp-asc">XP (Low to High)</option>
                          <option value="name-asc">Alphabetical</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[180px]">Explorer</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classroom</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[280px]">
                          {selectedMissionId === 'all' ? 'Mission Intelligence' : 'Mission Status'}
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {selectedMissionId === 'all' ? 'Global XP' : 'Mission XP'}
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredRoster.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center text-slate-400 text-sm font-medium italic">
                            No explorers matching the current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredRoster.map(student => {
                          const targetClass = classes.find(c => c.id === student.classId);
                          const studentProgressRecords = progress.filter(p => p.studentUid === student.uid);
                          
                          // Dynamically filter the visible mission badges
                          const visibleProgress = selectedMissionId === 'all' 
                            ? studentProgressRecords 
                            : studentProgressRecords.filter(p => p.questionSetId === selectedMissionId);

                          // Dynamically calculate XP for the XP column
                          const displayedXp = selectedMissionId === 'all'
                            ? (student.globalXp || 0)
                            : visibleProgress.reduce((sum, p) => sum + Object.values(p.scores || {}).reduce((acc: number, v: number) => acc + (v || 0), 0), 0);

                          return (
                            <tr key={student.uid} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px]">
                                    {student.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-800 text-sm whitespace-nowrap">{student.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{student.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-sm font-bold text-slate-600 whitespace-nowrap">
                                {targetClass?.name || 'Unknown Class'}
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(student.languageMastery || {}).length > 0 ? (
                                    Object.keys(student.languageMastery).map(lang => (
                                      <span key={lang} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded tracking-tighter">
                                        {lang}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[8px] text-slate-300 uppercase font-black tracking-widest italic">No Data</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-wrap gap-2">
                                  {visibleProgress.length > 0 ? (
                                    visibleProgress.map(p => {
                                      const pack = missions.find(m => m.id === p.questionSetId);
                                      const packXp = Object.values(p.scores || {}).reduce((acc: number, v: number) => acc + (v || 0), 0);
                                      const totalPossibleXp = pack?.questions?.reduce((acc: number, q) => acc + q.points, 0) || 0;
                                      const completionPercent = totalPossibleXp > 0 ? Math.round((packXp / totalPossibleXp) * 100) : 0;

                                      return (
                                        <div key={p.id} className="group relative">
                                          <div className="flex items-start gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl cursor-default hover:bg-indigo-100 transition-colors">
                                            <span className="text-[10px] font-black text-indigo-700 max-w-[140px] whitespace-normal leading-tight break-words">
                                              {pack?.title || 'Unknown Pack'}
                                            </span>
                                            <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded shadow-sm text-indigo-600 flex-none">
                                              {packXp} XP
                                            </span>
                                          </div>
                                          {/* Tooltip on hover */}
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-xl border border-slate-800">
                                            {completionPercent}% Proficiency • {p.completedQuestions.length}/{pack?.questions.length || 0} Tasks
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[9px] font-black text-slate-300 uppercase italic">
                                      {selectedMissionId === 'all' ? 'No Active Missions' : 'Not Started'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-baseline gap-1">
                                  <span className={`font-black text-lg ${selectedMissionId !== 'all' ? 'text-indigo-600' : 'text-slate-900'}`}>
                                    {displayedXp.toLocaleString()}
                                  </span>
                                  <span className="text-[9px] font-black text-indigo-400 uppercase">XP</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Active</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'classes' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col sm:flex-row gap-4 items-end bg-indigo-50/30 p-8 rounded-3xl border border-indigo-100">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest ml-1">Establish New Classroom</label>
                    <input 
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      placeholder="e.g. Advanced Python Period 1"
                      className="w-full px-5 py-4 rounded-2xl border border-indigo-100 outline-none focus:ring-4 focus:ring-indigo-500/10 bg-white font-bold"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleCreateClass}
                    disabled={isCreatingClass || !newClassName.trim()}
                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 disabled:bg-slate-300 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                  >
                    {isCreatingClass ? 'Establishing...' : 'Deploy Classroom'}
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {classes.map(c => (
                    <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col group relative hover:shadow-xl transition-all hover:border-indigo-200">
                       <div className="flex justify-between items-start mb-6">
                          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                             <ICONS.Book className="w-6 h-6" />
                          </div>
                          <button type="button" onClick={() => handleDeleteClass(c.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                       </div>
                       <h3 className="text-2xl font-black text-slate-800 mb-2 leading-tight">{c.name}</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Class Connection Code</p>
                       <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between mb-8 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                          <span className="font-mono text-3xl font-black text-indigo-600 tracking-tighter">{c.code}</span>
                          <button 
                            type="button"
                            onClick={() => navigator.clipboard.writeText(c.code)}
                            className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-100"
                          >
                            Copy
                          </button>
                       </div>
                       <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-green-500"></div>
                             <span>Live Explorers</span>
                          </div>
                          <span className="text-lg text-slate-900">{approvedStudents.filter(s => s.classId === c.id).length}</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : activeTab === 'missions' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {missions.length === 0 ? (
                <div className="col-span-full py-32 text-center text-slate-300">
                  <ICONS.Terminal className="w-16 h-16 mx-auto mb-6 opacity-20" />
                  <p className="text-lg font-black uppercase tracking-widest">No mission packs deployed.</p>
                </div>
              ) : (
                missions.map(set => (
                  <div key={set.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-indigo-300 transition-all shadow-sm group relative flex flex-col h-full hover:shadow-xl">
                    <div className="absolute top-4 right-4 z-[50]">
                      {deletingSetId === set.id ? (
                        <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-2 border border-slate-800">
                          <span className="text-[9px] font-black text-white uppercase tracking-tighter">Destroy?</span>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.id); }}
                            className="bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg hover:bg-red-700 transition-all"
                          >
                            Yes
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeletingSetId(null); }}
                            className="bg-slate-700 text-slate-300 text-[9px] font-black px-3 py-1.5 rounded-lg hover:bg-slate-600 transition-all"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeletingSetId(set.id); }} 
                          className="text-slate-300 hover:text-red-600 transition-all p-2.5 rounded-xl hover:bg-red-50 group/trash"
                          title="Delete Mission Pack"
                        >
                          <ICONS.Trash className="w-5 h-5 group-hover/trash:scale-110 transition-transform" />
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-start mb-6 pr-10">
                      <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-full tracking-wider border border-indigo-100">{set.language}</span>
                      <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${set.isPublic ? 'bg-green-50 border-green-100 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        {set.isPublic ? 'Global' : 'Private'}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">{set.title}</h3>
                    <p className="text-slate-500 text-sm mb-8 line-clamp-2 flex-grow leading-relaxed font-medium">{set.description}</p>
                    
                    <div className="flex justify-between items-center py-5 border-t border-slate-50 mb-6">
                      <div className="text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Passcode</p>
                        <p className="font-mono text-xl font-black text-indigo-500 tracking-tighter">{set.passcode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Challenges</p>
                        <p className="text-xl font-black text-slate-900 tracking-tighter">{set.questions.length}</p>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => { setActiveSetForEdit(set); setShowLab(true); }}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200"
                    >
                      <ICONS.Terminal className="w-5 h-5" />
                      Modify Package
                    </button>
                  </div>
                ))
              )}
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
