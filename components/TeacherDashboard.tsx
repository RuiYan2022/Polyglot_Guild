
import React, { useState, useEffect } from 'react';
import { TeacherProfile, QuestionSet, StudentProgress, ClassProfile, StudentProfile } from '../types';
import { storageService } from '../services/storageService';
import { ICONS } from '../constants';
import MissionLab from './MissionLab';
import Library from './Library';
import ExplorerDossier from './ExplorerDossier';

interface TeacherDashboardProps {
  profile: TeacherProfile;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'missions' | 'students' | 'classes' | 'library' | 'analytics'>('missions');
  const [missions, setMissions] = useState<QuestionSet[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [classes, setClasses] = useState<ClassProfile[]>([]);
  const [pendingStudents, setPendingStudents] = useState<StudentProfile[]>([]);
  const [approvedStudents, setApprovedStudents] = useState<StudentProfile[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSetId, setSelectedSetId] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [error, setError] = useState<string | null>(null);
  
  const [showLab, setShowLab] = useState(false);
  const [activeSetForEdit, setActiveSetForEdit] = useState<QuestionSet | undefined>(undefined);
  const [selectedExplorer, setSelectedExplorer] = useState<StudentProfile | null>(null);
  
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
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
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
    if (!window.confirm("Deny entrance?")) return;
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
      const taKey = `W-KEY-${Math.floor(Math.random() * 8999) + 1000}`;
      const newClass: ClassProfile = {
        id: `class_${Date.now()}`,
        teacherId: profile.uid,
        name: newClassName.trim(),
        code,
        taKey,
        createdAt: Date.now()
      };
      await storageService.saveClass(newClass);
      setNewClassName('');
      await loadData();
    } catch (err: any) {
      alert(err.message || "Could not create classroom.");
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (window.confirm("Delete classroom?")) {
      try {
        await storageService.deleteClass(id);
        await loadData();
      } catch (err: any) {
        alert(err.message || "Could not delete classroom.");
      }
    }
  };

  const handleRegenerateTAKey = async (c: ClassProfile) => {
    const newKey = `W-KEY-${Math.floor(Math.random() * 8999) + 1000}`;
    await storageService.saveClass({ ...c, taKey: newKey });
    await loadData();
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      await storageService.deleteQuestionSet(setId);
      await loadData();
      setDeletingSetId(null);
    } catch (err: any) {
      alert("Failed to delete mission pack.");
    }
  };

  const handleSaveSet = async (set: QuestionSet) => {
    try {
      await storageService.saveQuestionSet(set);
      setShowLab(false);
      setActiveSetForEdit(undefined);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save changes.");
    }
  };

  const { totalXp, avgXp, packStats } = (() => {
    const students = approvedStudents;
    // Fix: Explicitly type acc and s to avoid unknown type errors in reduce
    const tXp = students.reduce((acc: number, s: StudentProfile) => acc + (s.globalXp || 0), 0);
    const aXp = students.length > 0 ? Math.floor(tXp / students.length) : 0;
    const stats = missions.map(set => {
      const completedCount = progress.filter(p => p.questionSetId === set.id && p.completedQuestions.length === set.questions.length).length;
      const rate = students.length > 0 ? Math.round((completedCount / students.length) * 100) : 0;
      return { ...set, completionRate: rate };
    });
    return { totalXp: tXp, avgXp: aXp, packStats: stats };
  })();

  const recentActivity = [...progress]
    .sort((a, b) => b.lastActive - a.lastActive)
    .slice(0, 5);

  const getPointsForStudent = (studentUid: string) => {
    if (selectedSetId === 'all') {
      const student = approvedStudents.find(s => s.uid === studentUid);
      return student?.globalXp || 0;
    }
    const studentProgress = progress.find(p => p.studentUid === studentUid && p.questionSetId === selectedSetId);
    if (!studentProgress) return 0;
    // Fix: Explicitly type acc and score to avoid unknown type errors in reduce
    return Object.values(studentProgress.scores || {}).reduce((acc: number, score: number) => acc + (score || 0), 0);
  };

  const filteredAndSortedStudents = approvedStudents
    .filter(s => {
      if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;
      if (selectedSetId !== 'all') {
        const hasProgress = progress.some(p => p.studentUid === s.uid && p.questionSetId === selectedSetId);
        if (!hasProgress) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const valA = getPointsForStudent(a.uid);
      const valB = getPointsForStudent(b.uid);
      const diff = valA - valB;
      return sortOrder === 'desc' ? -diff : diff;
    });

  const selectedMissionTitle = missions.find(m => m.id === selectedSetId)?.title;

  const downloadStudentStatus = () => {
    const headers = ["Explorer Name", "Email", "Classroom", "Global XP"];
    if (selectedSetId !== 'all') {
      headers.push(`Node XP (${selectedMissionTitle})`, "Node Completion %");
    } else {
      headers.push("Completed Nodes Count");
    }

    const rows = filteredAndSortedStudents.map(s => {
      const className = classes.find(c => c.id === s.classId)?.name || 'Unassigned';
      const row = [s.name, s.email, className, s.globalXp];
      
      if (selectedSetId !== 'all') {
        const p = progress.find(pr => pr.studentUid === s.uid && pr.questionSetId === selectedSetId);
        const nodeXp = getPointsForStudent(s.uid);
        const mission = missions.find(m => m.id === selectedSetId);
        const completion = p && mission ? Math.round((p.completedQuestions.length / mission.questions.length) * 100) : 0;
        row.push(nodeXp, `${completion}%`);
      } else {
        const count = progress.filter(pr => pr.studentUid === s.uid).length;
        row.push(count);
      }
      return row.join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `academy_report_${selectedMissionTitle || 'global'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="p-8 md:p-12 max-w-7xl mx-auto w-full space-y-12">
        
        {/* Academy Header */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative overflow-hidden shadow-sm dark:shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{profile.schoolName}</h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-slate-500 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">Master: {profile.name} • Status: Online</p>
            </div>
          </div>
          <div className="flex items-center gap-10 relative z-10 bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Academy Portal Key</p>
              <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigator.clipboard.writeText(profile.academyCode)}>
                <p className="text-3xl font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{profile.academyCode}</p>
                <ICONS.Plus className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-500 transition-colors rotate-45" />
              </div>
            </div>
            <button 
              onClick={() => { setShowLab(true); setActiveSetForEdit(undefined); }}
              className="bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95"
            >
              Initialize Node
            </button>
          </div>
        </div>

        {/* Global Tabs */}
        <div className="flex border-b border-slate-200 dark:border-white/5 gap-12 overflow-x-auto scrollbar-hide px-2">
          {[
            { id: 'missions', label: 'Nodes', icon: ICONS.Terminal },
            { id: 'classes', label: 'Classrooms', icon: ICONS.Book },
            { id: 'students', label: 'Explorers', icon: ICONS.Users, count: pendingStudents.length },
            { id: 'analytics', label: 'Intelligence', icon: ICONS.Trophy },
            { id: 'library', label: 'Archives', icon: ICONS.Globe }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setShowLab(false); }}
              className={`flex items-center gap-3 py-6 px-1 font-black transition-all relative whitespace-nowrap text-[10px] uppercase tracking-[0.2em] ${
                activeTab === tab.id && !showLab ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-red-500 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && !showLab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-500 rounded-t-full shadow-[0_0_10px_rgba(99,102,241,1)]"></div>}
            </button>
          ))}
        </div>

        {/* Main Interface Content */}
        <div className="mt-4">
          {showLab ? (
            <MissionLab teacherId={profile.uid} authorName={profile.name} initialSet={activeSetForEdit} onSave={handleSaveSet} onCancel={() => setShowLab(false)} />
          ) : activeTab === 'analytics' ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {[
                    { label: 'Active Explorers', val: approvedStudents.length, color: 'text-slate-900 dark:text-white' },
                    { label: 'Cumulative XP', val: totalXp.toLocaleString(), color: 'text-indigo-600 dark:text-indigo-400' },
                    { label: 'Average Node Score', val: avgXp.toLocaleString(), color: 'text-violet-600 dark:text-violet-400' },
                    { label: 'Node Saturation', val: `${packStats.length > 0 ? Math.round(packStats.reduce((acc, s) => acc + s.completionRate, 0) / packStats.length) : 0}%`, color: 'text-green-600 dark:text-green-400' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-xl">
                       <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">{stat.label}</p>
                       <p className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.val}</p>
                    </div>
                  ))}
               </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-12">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-xl">
                      <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/30 flex justify-between items-center">
                        <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest">Node Saturation Map</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950/50">
                            <tr>
                              <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Node Package</th>
                              <th className="px-8 py-4 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Proficiency</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {packStats.map(set => (
                              <tr key={set.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-8 py-5 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">{set.title}</td>
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-4">
                                      <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                         <div className={`h-full ${set.completionRate < 30 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${set.completionRate}%` }}></div>
                                      </div>
                                      <span className="text-xs font-black text-slate-900 dark:text-white">{set.completionRate}%</span>
                                   </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* On Fire & Overdrive Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-orange-200 dark:border-orange-500/20 shadow-sm dark:shadow-xl">
                          <h3 className="font-black text-orange-600 dark:text-orange-400 text-[9px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             <ICONS.Flame className="w-4 h-4 fill-current" /> On Fire Explorers
                          </h3>
                          <div className="space-y-4">
                             {approvedStudents.filter(s => (s.streak || 0) >= 3).length === 0 ? (
                               <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase italic">No active streaks detected.</p>
                             ) : (
                               approvedStudents.filter(s => (s.streak || 0) >= 3).sort((a,b) => (b.streak || 0) - (a.streak || 0)).slice(0, 5).map(s => (
                                 <div key={s.uid} className="flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{s.name}</span>
                                    <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-lg font-black text-[10px] border border-orange-200 dark:border-orange-500/30">{s.streak} Days</span>
                                 </div>
                               ))
                             )}
                          </div>
                       </div>

                       <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-indigo-200 dark:border-indigo-500/20 shadow-sm dark:shadow-xl">
                          <h3 className="font-black text-indigo-600 dark:text-indigo-400 text-[9px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             <ICONS.Zap className="w-4 h-4 fill-current" /> Overdrive Active
                          </h3>
                          <div className="space-y-4">
                             {approvedStudents.filter(s => (s.overdriveQuestionsLeft || 0) > 0).length === 0 ? (
                               <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase italic">No overdrive sessions active.</p>
                             ) : (
                               approvedStudents.filter(s => (s.overdriveQuestionsLeft || 0) > 0).slice(0, 5).map(s => (
                                 <div key={s.uid} className="flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{s.name}</span>
                                    <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg font-black text-[10px] border border-indigo-200 dark:border-indigo-500/30">{s.overdriveQuestionsLeft} Nodes Left</span>
                                 </div>
                               ))
                             )}
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 shadow-sm dark:shadow-xl">
                    <h3 className="font-black text-slate-900 dark:text-white text-[9px] uppercase tracking-[0.2em] mb-8 border-b border-slate-200 dark:border-white/5 pb-4">Recent Uplinks</h3>
                    <div className="space-y-6">
                      {recentActivity.map((act, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{act.studentName}</p>
                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-tighter">Cleared node in {act.language}</p>
                          </div>
                          <span className="text-[8px] font-mono text-slate-400 dark:text-slate-700">{new Date(act.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
          ) : activeTab === 'students' ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {pendingStudents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingStudents.map(student => (
                    <div key={student.uid} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-indigo-200 dark:border-indigo-500/30 shadow-sm dark:shadow-2xl flex flex-col hover:border-indigo-400 transition-all">
                       <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xl">
                              {student.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-tight">{student.name}</p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase mt-1">Pending Clearance</p>
                            </div>
                          </div>
                       </div>
                       <div className="flex gap-3 mt-auto pt-6 border-t border-slate-100 dark:border-white/5">
                          <button onClick={() => handleApprove(student.uid)} disabled={isProcessingApproval === student.uid} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 transition-all">Grant Access</button>
                          <button onClick={() => handleDeny(student.uid)} disabled={isProcessingApproval === student.uid} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-all">Deny</button>
                       </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-xl">
                <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/30 flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest">Academy Personnel Roster</h3>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <button 
                      onClick={downloadStudentStatus}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                      <ICONS.Download className="w-3.5 h-3.5" />
                      Report
                    </button>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1">Classroom</span>
                      <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-[9px] font-black text-indigo-600 dark:text-indigo-400 px-4 py-2 uppercase tracking-widest outline-none">
                        <option value="all">Global</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1">Mission Node Filter</span>
                      <select value={selectedSetId} onChange={e => setSelectedSetId(e.target.value)} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-[9px] font-black text-indigo-600 dark:text-indigo-400 px-4 py-2 uppercase tracking-widest outline-none">
                        <option value="all">Any Node (Global XP)</option>
                        {missions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/50">
                    <tr>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Explorer Name</th>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Status / Streak</th>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Node Syncs</th>
                      <th 
                        className="px-8 py-5 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      >
                        {selectedSetId === 'all' ? 'Global XP' : `Node Points (${selectedMissionTitle})`} {sortOrder === 'desc' ? '↓' : '↑'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredAndSortedStudents.map(student => (
                      <tr 
                        key={student.uid} 
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group/row"
                        onClick={() => setSelectedExplorer(student)}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-[10px] group-hover/row:bg-indigo-600 group-hover/row:text-white transition-all">
                              {student.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 dark:text-white text-xs uppercase group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400 transition-colors">{student.name}</span>
                              {student.overdriveQuestionsLeft > 0 && (
                                <span className="text-[8px] font-black text-indigo-500 uppercase flex items-center gap-1">
                                  <ICONS.Zap className="w-2.5 h-2.5 fill-current" /> Overdrive Active
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            {student.streak > 0 ? (
                              <div className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-500/20 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-500/30">
                                <ICONS.Flame className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 fill-current" />
                                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400">{student.streak}</span>
                              </div>
                            ) : (
                              <span className="text-[9px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-widest">No Streak</span>
                            )}
                            
                            {student.dailyPoints >= 3 && (
                              <div className="bg-green-100 dark:bg-green-500/20 p-1.5 rounded-lg border border-green-200 dark:border-green-500/30" title="Daily Goal Met">
                                <ICONS.Trophy className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex gap-2 flex-wrap">
                            {progress
                              .filter(p => p.studentUid === student.uid && (selectedSetId === 'all' || p.questionSetId === selectedSetId))
                              .map(p => (
                                <span key={p.id} className="text-[8px] font-black bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg uppercase">
                                  {missions.find(m => m.id === p.questionSetId)?.title || '...'}
                                </span>
                              ))
                            }
                          </div>
                        </td>
                        <td className="px-8 py-6 font-black text-slate-900 dark:text-white text-lg">
                          {getPointsForStudent(student.uid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'classes' ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-2xl flex flex-col md:flex-row gap-6 items-end">
                  <div className="flex-1 space-y-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest ml-1">New Classroom Designation</p>
                    <input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="DESIGNATE CLASS NAME..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-6 py-5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 dark:text-white uppercase tracking-widest placeholder:text-slate-300 dark:placeholder:text-slate-800" />
                  </div>
                  <button onClick={handleCreateClass} disabled={isCreatingClass || !newClassName.trim()} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-50">Establish Link</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {classes.map(c => (
                    <div key={c.id} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-2xl relative group hover:border-indigo-500/50 transition-all">
                       <button onClick={() => handleDeleteClass(c.id)} className="absolute top-6 right-6 text-slate-300 dark:text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><ICONS.Trash className="w-5 h-5" /></button>
                       <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 leading-tight uppercase italic">{c.name}</h3>
                       
                       <div className="space-y-4">
                         <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10 transition-all">
                            <div>
                              <p className="text-[8px] font-black text-slate-400 dark:text-slate-700 uppercase mb-1">Class ID</p>
                              <span className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{c.code}</span>
                            </div>
                            <button onClick={() => navigator.clipboard.writeText(c.code)} className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors">Copy</button>
                         </div>

                         <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-500/10 flex items-center justify-between group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/10 transition-all">
                            <div>
                              <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-700 uppercase mb-1">Warden Access Key</p>
                              <span className="font-mono text-lg font-black text-emerald-500 dark:text-emerald-400 tracking-tighter">{c.taKey || 'N/A'}</span>
                            </div>
                            <button onClick={() => handleRegenerateTAKey(c)} className="text-[8px] font-black uppercase text-emerald-400 dark:text-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Refresh</button>
                         </div>
                       </div>

                       <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest">
                          <span>Live Connections</span>
                          <span className="text-lg text-slate-900 dark:text-white">{approvedStudents.filter(s => s.classId === c.id).length}</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : activeTab === 'missions' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {missions.map(set => (
                <div key={set.id} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-all shadow-sm dark:shadow-2xl group flex flex-col h-full relative overflow-hidden">
                    <button onClick={() => setDeletingSetId(set.id)} className="absolute top-6 right-6 text-slate-300 dark:text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><ICONS.Trash className="w-5 h-5" /></button>
                    {deletingSetId === set.id && <div className="absolute inset-0 z-50 bg-red-600 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300"><p className="text-xl font-black text-white uppercase mb-6">Wipe Node Package?</p><div className="flex gap-4"><button onClick={() => handleDeleteSet(set.id)} className="bg-white text-red-600 px-6 py-2 rounded-xl font-black text-xs uppercase">Yes, Destruct</button><button onClick={() => setDeletingSetId(null)} className="bg-red-900 text-white px-6 py-2 rounded-xl font-black text-xs uppercase">Abort</button></div></div>}
                    <div className="flex justify-between items-center mb-8">
                      <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-indigo-200 dark:border-indigo-500/30">{set.language}</span>
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest">{set.isPublic ? 'Public' : 'Private'}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight leading-tight">{set.title}</h3>
                    <p className="text-slate-500 dark:text-slate-500 text-xs mb-8 line-clamp-2 font-bold uppercase tracking-wide leading-relaxed">{set.description}</p>
                    <div className="mt-auto pt-8 border-t border-slate-100 dark:border-white/5 flex justify-between items-end">
                      <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 rounded-2xl border border-slate-100 dark:border-white/5">
                        <p className="text-[8px] font-black text-slate-400 dark:text-slate-700 uppercase mb-1">Passcode</p>
                        <p className="text-xl font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{set.passcode}</p>
                      </div>
                      <button onClick={() => { setActiveSetForEdit(set); setShowLab(true); }} className="p-4 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-400 rounded-2xl transition-all shadow-sm dark:shadow-xl"><ICONS.Terminal className="w-5 h-5" /></button>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <Library currentTeacherId={profile.uid} onImport={() => setActiveTab('missions')} />
          )}
        </div>
      </div>

      {selectedExplorer && (
        <ExplorerDossier 
          student={selectedExplorer}
          teacher={profile}
          allProgress={progress}
          allMissions={missions}
          onClose={() => setSelectedExplorer(null)}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
