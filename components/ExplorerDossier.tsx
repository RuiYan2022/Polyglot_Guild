
import React, { useState } from 'react';
import { StudentProfile, StudentProgress, QuestionSet, Question, Directive, TeacherProfile } from '../types';
import { ICONS } from '../constants';
import { storageService } from '../services/storageService';

interface ExplorerDossierProps {
  student: StudentProfile;
  teacher: TeacherProfile;
  allProgress: StudentProgress[];
  allMissions: QuestionSet[];
  onClose: () => void;
}

const ExplorerDossier: React.FC<ExplorerDossierProps> = ({ student, teacher, allProgress, allMissions, onClose }) => {
  const studentProgress = allProgress.filter(p => p.studentUid === student.uid);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(
    studentProgress.length > 0 ? studentProgress[0].questionSetId : null
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'diagnostic' | 'directives'>('diagnostic');
  const [directiveMsg, setDirectiveMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  const activeProgress = studentProgress.find(p => p.questionSetId === selectedSetId);
  const activeMission = allMissions.find(m => m.id === selectedSetId);
  
  const activeQuestion = activeMission?.questions.find(q => q.id === (selectedQuestionId || activeMission.questions[0]?.id));

  const handleSendDirective = async () => {
    if (!directiveMsg.trim()) return;
    setIsSending(true);
    try {
      const newDirective: Directive = {
        id: `dir_${Date.now()}`,
        studentUid: student.uid,
        teacherId: teacher.uid,
        teacherName: teacher.name,
        message: directiveMsg.trim(),
        questionSetId: selectedSetId || undefined,
        questionId: activeQuestion?.id,
        timestamp: Date.now(),
        isRead: false,
        type: 'directive'
      };
      await storageService.sendDirective(newDirective);
      setDirectiveMsg('');
      alert("Directive Transmitted.");
    } catch (err) {
      alert("Transmission Failed.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-slate-900 border-b border-white/5 p-6 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all">
            <ICONS.Plus className="w-6 h-6 rotate-45" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{student.name}</h2>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Explorer Dossier • {student.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Global Mastery</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">{student.globalXp.toLocaleString()}</span>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded font-black uppercase">XP</span>
            </div>
          </div>
          {student.streak >= 3 && (
            <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-2xl flex items-center gap-3">
              <ICONS.Flame className="w-5 h-5 text-orange-500 fill-current animate-pulse" />
              <div>
                <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">On Fire</p>
                <p className="text-xs font-black text-white uppercase">{student.streak} Day Streak</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Rail: Mission Packs */}
        <div className="w-80 bg-slate-900/50 border-r border-white/5 flex flex-col">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synchronized Nodes</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 dark-scrollbar">
            {studentProgress.length === 0 ? (
              <div className="py-20 text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">No Data Logged</div>
            ) : (
              studentProgress.map(p => {
                const mission = allMissions.find(m => m.id === p.questionSetId);
                const isActive = selectedSetId === p.questionSetId;
                const completion = mission ? Math.round((p.completedQuestions.length / mission.questions.length) * 100) : 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedSetId(p.questionSetId);
                      setSelectedQuestionId(null);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all group ${
                      isActive 
                        ? 'bg-indigo-600/10 border-indigo-500/50 text-white' 
                        : 'bg-transparent border-white/5 text-slate-500 hover:bg-white/5'
                    }`}
                  >
                    <p className="font-black text-xs uppercase tracking-tight mb-2">{mission?.title || 'Unknown Node'}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden mr-3">
                        <div className="h-full bg-indigo-500" style={{ width: `${completion}%` }}></div>
                      </div>
                      <span className="text-[9px] font-black opacity-60">{completion}%</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Pane: Intelligence */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {!activeMission ? (
            <div className="flex-1 flex items-center justify-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">Select a Node to View Intelligence</div>
          ) : (
            <>
              {/* Question Selector */}
              <div className="p-6 border-b border-white/5 bg-slate-900/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-500/20 text-indigo-400 p-3 rounded-xl">
                    <ICONS.Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white uppercase tracking-tight">{activeMission.title}</h4>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{activeMission.language} Protocol</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {activeMission.questions.map((q, idx) => {
                    const isCompleted = activeProgress?.completedQuestions.includes(q.id);
                    const isActive = (selectedQuestionId || activeMission.questions[0]?.id) === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedQuestionId(q.id)}
                        className={`w-10 h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all border ${
                          isActive 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                            : isCompleted
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                              : 'bg-slate-900 border-white/5 text-slate-600 hover:border-white/20'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Code Vault */}
                <div className="flex-1 flex flex-col border-r border-white/5">
                  <div className="bg-slate-900/50 px-6 py-3 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Source Code Buffer</span>
                    {activeQuestion && (
                      <span className={`text-[9px] font-black uppercase tracking-widest ${activeProgress?.completedQuestions.includes(activeQuestion.id) ? 'text-emerald-500' : 'text-amber-500'}`}>
                        Status: {activeProgress?.completedQuestions.includes(activeQuestion.id) ? 'Secured' : 'In-Progress'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 bg-slate-950 p-8 font-mono text-sm text-indigo-100/80 overflow-auto dark-scrollbar leading-relaxed">
                    {activeQuestion ? (
                      <pre className="whitespace-pre-wrap">
                        {activeProgress?.draftCodes?.[activeQuestion.id] || '// No code recorded for this node.'}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">No Node Selected</div>
                    )}
                  </div>
                </div>

                {/* Diagnostic History & Directives */}
                <div className="w-[400px] bg-slate-900/30 flex flex-col">
                  <div className="flex border-b border-white/5 bg-slate-900/50">
                    <button 
                      onClick={() => setRightPanelTab('diagnostic')}
                      className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest transition-all ${rightPanelTab === 'diagnostic' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Diagnostic Logs
                    </button>
                    <button 
                      onClick={() => setRightPanelTab('directives')}
                      className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest transition-all ${rightPanelTab === 'directives' ? 'text-indigo-400 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Guild Directives
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6 dark-scrollbar">
                    {rightPanelTab === 'diagnostic' ? (
                      activeQuestion ? (
                        (() => {
                          const history = activeProgress?.feedbackHistory?.filter(h => h.questionId === activeQuestion.id) || [];
                          return history.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">No Logs Found</div>
                          ) : (
                            history.map((entry, i) => (
                              <div key={i} className="bg-slate-900/50 border border-white/5 p-5 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${entry.success ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {entry.success ? 'SUCCESS' : 'FAILURE'}
                                  </span>
                                  <span className="text-[8px] font-mono text-slate-600">
                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed italic font-medium">"{entry.feedback}"</p>
                                {entry.success && (
                                  <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-[8px] font-black text-slate-500 uppercase">Points Awarded</span>
                                    <span className="text-xs font-black text-white">{entry.score} XP</span>
                                  </div>
                                )}
                              </div>
                            ))
                          );
                        })()
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">Select a Node</div>
                      )
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="flex-1 space-y-6">
                          <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-[2rem] space-y-4">
                            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">New Directive</h5>
                            <textarea 
                              value={directiveMsg}
                              onChange={e => setDirectiveMsg(e.target.value)}
                              placeholder="Enter tactical guidance for this Explorer..."
                              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500 min-h-[150px] resize-none font-medium"
                            />
                            <button 
                              onClick={handleSendDirective}
                              disabled={isSending || !directiveMsg.trim()}
                              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                              {isSending ? 'Transmitting...' : 'Transmit Directive'}
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">Recent Comms</h5>
                            <div className="text-center py-10 opacity-20 italic text-[10px] font-black uppercase tracking-widest">
                              End of Log
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorerDossier;
