import React, { useState, useEffect } from 'react';
import { TeacherProfile, ClassProfile, StudentProfile, StudentProgress, QuestionSet, Question } from '../types';
import { storageService } from '../services/storageService';
import { ICONS } from '../constants';

interface WardenDashboardProps {
  teacher: TeacherProfile;
  activeClass: ClassProfile;
}

const WardenDashboard: React.FC<WardenDashboardProps> = ({ teacher, activeClass }) => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [missions, setMissions] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'library'>('roster');
  const [selectedSetId, setSelectedSetId] = useState<string>('all');
  const [viewingSet, setViewingSet] = useState<QuestionSet | null>(null);

  const loadData = async () => {
    try {
      const [s, p, m] = await Promise.all([
        storageService.getStudentsByClass(activeClass.id),
        storageService.getProgressByClass(activeClass.id),
        storageService.getQuestionSets(teacher.uid)
      ]);
      setStudents(s);
      setProgress(p);
      setMissions(m);
    } catch (err) {
      console.error("Warden sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const getPointsForStudent = (studentUid: string, setId: string) => {
    const studentProgress = progress.find(p => p.studentUid === studentUid && p.questionSetId === setId);
    if (!studentProgress) return 0;
    return Object.values(studentProgress.scores || {}).reduce((acc: number, score: number) => acc + (score || 0), 0);
  };

  const handleExport = () => {
    const selectedMission = missions.find(m => m.id === selectedSetId);
    
    const headers = ["Explorer", "Email", "Class", "Status"];
    if (selectedMission) {
      headers.push(`Points (${selectedMission.title})`, "Node Progress %");
    } else {
      headers.push("Total Global XP", "Active Mission Packs");
    }

    const rows = students.map(s => {
      const sProgress = progress.filter(p => p.studentUid === s.uid);
      const row = [s.name, s.email, activeClass.name, s.status];
      
      if (selectedMission) {
        const points = getPointsForStudent(s.uid, selectedMission.id);
        const p = sProgress.find(pr => pr.questionSetId === selectedMission.id);
        const completion = p ? Math.round((p.completedQuestions.length / selectedMission.questions.length) * 100) : 0;
        row.push(points.toString(), `${completion}%`);
      } else {
        row.push(s.globalXp.toString(), sProgress.length.toString());
      }
      return row.join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = selectedMission 
      ? `warden_report_${activeClass.name}_${selectedMission.title.replace(/\s+/g, '_')}.csv`
      : `warden_global_report_${activeClass.name}.csv`;
    a.download = filename;
    a.click();
  };

  if (loading) return <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black uppercase text-xs animate-pulse transition-colors duration-300">Calibrating Class Signal...</div>;

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      <div className="p-8 bg-white dark:bg-slate-900 border-b border-emerald-500/20 flex flex-col lg:flex-row justify-between lg:items-center gap-6 shadow-sm dark:shadow-2xl">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{activeClass.name} <span className="text-emerald-600 dark:text-emerald-500">Observation</span></h2>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Guild Master: {teacher.name} • Warden Mode</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1">Mission Perspective</span>
              <select 
                value={selectedSetId} 
                onChange={e => setSelectedSetId(e.target.value)}
                className="bg-white dark:bg-slate-950 border border-emerald-500/30 rounded-xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 px-4 py-3 uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="all">Global Roster</option>
                {missions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
           </div>
           <button 
             onClick={handleExport} 
             className="mt-auto bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
           >
             <ICONS.Download className="w-3.5 h-3.5" />
             Collect Intelligence
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Nav */}
        <div className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-white/5 p-6 space-y-2 hidden md:block">
           <button onClick={() => { setActiveTab('roster'); setViewingSet(null); }} className={`w-full text-left p-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'roster' ? 'bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-lg' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>The Roster</button>
           <button onClick={() => { setActiveTab('library'); setViewingSet(null); }} className={`w-full text-left p-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'library' ? 'bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-lg' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>Node Archives</button>
        </div>

        {/* Center: Main View */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 dark-scrollbar">
          {activeTab === 'roster' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-2xl h-fit">
                  <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Personnel Directory</h3>
                    {selectedSetId !== 'all' && (
                      <button 
                        onClick={() => {
                          const m = missions.find(x => x.id === selectedSetId);
                          if (m) setViewingSet(m);
                        }}
                        className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase border border-emerald-500/30 px-3 py-1 rounded-lg hover:bg-emerald-500/10"
                      >
                        Inspect Mission Nodes
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950/50">
                        <tr>
                          <th className="px-8 py-5 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase">Explorer</th>
                          <th className="px-8 py-5 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase">Status</th>
                          <th className="px-8 py-5 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase text-right">
                            {selectedSetId === 'all' ? 'Total XP' : 'Mission Pts'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-8 py-20 text-center text-slate-300 dark:text-slate-700 font-black uppercase text-[10px] tracking-widest italic">No active telemetry found for this sector.</td>
                          </tr>
                        ) : students.map(s => {
                          const sProgress = progress.filter(p => p.studentUid === s.uid);
                          const scoreDisplay = selectedSetId === 'all' 
                            ? s.globalXp 
                            : getPointsForStudent(s.uid, selectedSetId);
                          
                          return (
                            <tr key={s.uid} onClick={() => setSelectedStudent(s)} className={`cursor-pointer transition-colors group ${selectedStudent?.uid === s.uid ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-emerald-50 dark:hover:bg-emerald-500/5'}`}>
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-[9px] group-hover:scale-110 transition-transform">{s.name.substring(0, 2).toUpperCase()}</div>
                                    <span className="font-black text-slate-900 dark:text-white text-xs uppercase">{s.name}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 {selectedSetId === 'all' ? (
                                   <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500">{sProgress.length} ACTIVE NODES</span>
                                 ) : (
                                   <div className="flex items-center gap-2">
                                      {(() => {
                                        const p = sProgress.find(pr => pr.questionSetId === selectedSetId);
                                        const mission = missions.find(m => m.id === selectedSetId);
                                        const pct = p && mission ? Math.round((p.completedQuestions.length / mission.questions.length) * 100) : 0;
                                        return (
                                          <>
                                            <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }}></div>
                                            </div>
                                            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-500">{pct}%</span>
                                          </>
                                        );
                                      })()}
                                   </div>
                                 )}
                              </td>
                              <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white text-base tracking-tighter">{scoreDisplay.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
               </div>

               <div className="space-y-8">
                {viewingSet ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-emerald-500/50 p-10 animate-in fade-in slide-in-from-right-4 shadow-sm dark:shadow-2xl relative">
                    <button 
                      onClick={() => setViewingSet(null)}
                      className="absolute top-8 right-8 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Close Archive</span>
                    </button>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase italic">{viewingSet.title}</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase mb-8 border-b border-slate-100 dark:border-white/5 pb-4 tracking-widest">Question Repository • {viewingSet.language}</p>
                    
                    <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 dark-scrollbar">
                      {viewingSet.questions.map((q, idx) => (
                        <div key={q.id} className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                           <div className="flex justify-between items-start">
                              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Node {idx + 1}: {q.difficulty}</span>
                              <span className="text-slate-900 dark:text-white font-black text-[10px]">{q.points} XP</span>
                           </div>
                           <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{q.title}</h4>
                           <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">{q.description}</p>
                           
                           <div className="space-y-4 pt-2">
                              <div>
                                 <p className="text-[8px] font-black text-slate-400 dark:text-slate-700 uppercase mb-2">Starter Signal</p>
                                 <pre className="bg-white dark:bg-slate-900 p-4 rounded-xl text-[9px] font-mono text-emerald-600 dark:text-emerald-400/70 overflow-x-auto border border-slate-100 dark:border-white/5">
                                    {q.starterCode}
                                 </pre>
                              </div>
                              <div>
                                 <p className="text-[8px] font-black text-amber-600 dark:text-amber-900 uppercase mb-2">Intelligence Hint</p>
                                 <p className="text-[10px] text-amber-700 dark:text-amber-200/50 italic bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                    {q.solutionHint}
                                 </p>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedStudent ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-emerald-500/30 p-10 animate-in fade-in slide-in-from-right-4 shadow-sm dark:shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                        <ICONS.Users className="w-32 h-32 text-emerald-600 dark:text-emerald-500" />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 uppercase italic">{selectedStudent.name} <span className="text-emerald-600 dark:text-emerald-500">Trace</span></h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-10">
                           <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                              <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1">Global Mastery</p>
                              <p className="text-xl font-black text-slate-900 dark:text-white">{selectedStudent.globalXp.toLocaleString()} XP</p>
                           </div>
                           <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                              <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1">Sector Rank</p>
                              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">#{( [...students].sort((a,b) => b.globalXp - a.globalXp).findIndex(s => s.uid === selectedStudent.uid) + 1)}</p>
                           </div>
                        </div>

                        <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 dark:border-white/5 pb-2">Active Signals</h4>
                        <div className="space-y-6">
                          {progress.filter(p => p.studentUid === selectedStudent.uid).length === 0 ? (
                            <div className="py-20 text-center text-slate-300 dark:text-slate-700 font-black text-[9px] uppercase tracking-widest italic">No active node connections.</div>
                          ) : progress.filter(p => p.studentUid === selectedStudent.uid).map(p => {
                            const mission = missions.find(m => m.id === p.questionSetId);
                            const missionPoints = Object.values(p.scores || {}).reduce((acc: number, v: any) => acc + (v || 0), 0);
                            
                            return (
                              <div key={p.id} className={`bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border transition-all ${selectedSetId === p.questionSetId ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'border-slate-100 dark:border-white/5'}`}>
                                  <div className="flex justify-between items-start mb-6">
                                    <div>
                                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1">{mission?.title || 'Unknown Node'}</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase">{p.completedQuestions.length} / {mission?.questions.length || 0} SECURED</span>
                                        <span className="text-emerald-600 dark:text-emerald-500 text-[10px] font-black">• {missionPoints} Pts</span>
                                      </div>
                                    </div>
                                    <span className="text-[8px] font-mono text-slate-300 dark:text-slate-800">{new Date(p.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>

                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-700 uppercase mb-2">Diagnostic Data (Draft)</p>
                                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-white/5 font-mono text-[9px] text-emerald-600 dark:text-emerald-400/60 h-28 overflow-y-auto dark-scrollbar whitespace-pre">
                                        {Object.values(p.draftCodes || {})[0] || '// Signal Idle'}
                                      </div>
                                    </div>
                                    
                                    {p.feedbackHistory && p.feedbackHistory.length > 0 && (
                                      <div className="pt-2">
                                        <p className="text-[8px] font-black text-slate-400 dark:text-slate-700 uppercase mb-2">Recent Uplink Logic</p>
                                        <div className="text-[9px] text-slate-500 dark:text-slate-500 italic line-clamp-2">
                                          "{p.feedbackHistory[0].feedback}"
                                        </div>
                                      </div>
                                    )}
                                  </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                  </div>
                ) : (
                  <div className="h-full bg-slate-100/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center p-20 text-center">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-full mb-6 shadow-sm">
                      <ICONS.Users className="w-10 h-10 text-slate-200 dark:text-slate-800" />
                    </div>
                    <p className="text-slate-400 dark:text-slate-700 font-black uppercase text-[10px] tracking-widest leading-relaxed">Select an explorer from the roster <br/> to perform a deep-trace diagnostic.</p>
                  </div>
                )}
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
               {missions.map(set => (
                 <div key={set.id} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-2xl opacity-80 group hover:opacity-100 transition-all hover:border-emerald-500/20">
                    <div className="flex justify-between items-center mb-6">
                       <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase rounded-lg">{set.language}</span>
                       <span className="text-[8px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest">Master: {teacher.name}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">{set.title}</h4>
                    <p className="text-slate-500 dark:text-slate-600 text-[9px] font-black uppercase mb-8 line-clamp-2 leading-relaxed">{set.description}</p>
                    <div className="space-y-3">
                       {set.questions.slice(0, 4).map((q, i) => (
                         <div key={q.id} className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 dark:text-slate-700 group-hover:text-slate-600 dark:group-hover:text-slate-500 transition-colors">
                            <span className="truncate w-32">{i + 1}. {q.title}</span>
                            <div className="flex items-center gap-2">
                               <span className="opacity-50">{q.difficulty}</span>
                               <span className="text-emerald-700 dark:text-emerald-900 group-hover:text-emerald-600 dark:group-hover:text-emerald-700">{q.points}XP</span>
                            </div>
                         </div>
                       ))}
                       {set.questions.length > 4 && <p className="text-[8px] text-slate-300 dark:text-slate-800 font-black uppercase tracking-widest text-center pt-4">+ {set.questions.length - 4} MORE NODES IN ARCHIVE</p>}
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                       <div className="text-[8px] font-black text-slate-400 dark:text-slate-800 uppercase">Portal Entry: {set.passcode}</div>
                       <div className="flex gap-2">
                        <button 
                          onClick={() => setViewingSet(set)}
                          className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase hover:underline"
                        >
                          Inspect Nodes
                        </button>
                        <button 
                          onClick={() => { setSelectedSetId(set.id); setActiveTab('roster'); }}
                          className="text-[8px] font-black text-slate-900 dark:text-white uppercase hover:underline"
                        >
                          View Roster →
                        </button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WardenDashboard;
