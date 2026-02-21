
import React, { useState, useEffect, useRef } from 'react';
import { QuestionSet, StudentProgress, AIResponse, StudentProfile, ProgrammingLanguage, Question, FeedbackEntry } from '../types';
import { evaluateCodeStream } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { ICONS } from '../constants';
import TrophyRoom from './TrophyRoom';

interface StudentPortalProps {
  profile: StudentProfile;
  onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ profile, onLogout }) => {
  const [view, setView] = useState<'hub' | 'editor'>('hub');
  const [activeSet, setActiveSet] = useState<QuestionSet | null>(null);
  const [unlockedSets, setUnlockedSets] = useState<QuestionSet[]>([]);
  const [leaderboard, setLeaderboard] = useState<StudentProfile[]>([]);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [code, setCode] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [streamingFeedback, setStreamingFeedback] = useState('');
  const [lastResult, setLastResult] = useState<AIResponse | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Challenging'>('Easy');
  const [rightPanelTab, setRightPanelTab] = useState<'diagnostic' | 'history'>('diagnostic');
  
  const [showTrophyRoom, setShowTrophyRoom] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockedMsg, setUnlockedMsg] = useState<string | null>(null);
  const [globalProfile, setGlobalProfile] = useState<StudentProfile>(profile);
  const [progress, setProgress] = useState<StudentProgress | null>(null);

  const saveTimeoutRef = useRef<any>(null);
  const difficulties: ('Easy' | 'Medium' | 'Hard' | 'Challenging')[] = ['Easy', 'Medium', 'Hard', 'Challenging'];

  const refreshProfile = async () => {
    const [updated, lb] = await Promise.all([
      storageService.getStudentProfile(globalProfile.uid),
      storageService.getAcademyLeaderboard(globalProfile.masterKey)
    ]);
    
    if (updated) {
      setGlobalProfile(updated);
      const teacherSets = await storageService.getQuestionSets(updated.masterKey);
      const filtered = teacherSets.filter(s => updated.unlockedSets.includes(s.id));
      setUnlockedSets(filtered);
    }
    setLeaderboard(lb);
  };

  useEffect(() => { refreshProfile(); }, [globalProfile.uid]);

  // Handle auto-saving of code drafts
  useEffect(() => {
    if (view === 'editor' && progress && activeSet) {
      const currentQ = activeSet.questions[currentIdx];
      
      // Update local progress state immediately to keep UI in sync
      const updatedProgress = {
        ...progress,
        draftCodes: { ...(progress.draftCodes || {}), [currentQ.id]: code }
      };
      setProgress(updatedProgress);

      // Debounce saving to Firestore
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        await storageService.saveProgress(updatedProgress);
        setIsSaving(false);
      }, 2000);
    }
  }, [code, currentIdx]);

  const handleSelectSet = async (set: QuestionSet) => {
    setActiveSet(set);
    const all = await storageService.getStudentProgressByUid(globalProfile.uid, set.teacherId);
    const existing = all.find(a => a.questionSetId === set.id);
    const initialProgress: StudentProgress = existing || {
      id: `p_${globalProfile.uid}_${set.id}`,
      studentUid: globalProfile.uid,
      studentName: globalProfile.name,
      teacherId: set.teacherId,
      classId: globalProfile.classId,
      questionSetId: set.id,
      completedQuestions: [],
      scores: {},
      draftCodes: {},
      feedbackHistory: [],
      lastActive: Date.now(),
      language: set.language
    };
    setProgress(initialProgress);
    setView('editor');
    const firstEasy = set.questions.find(q => q.difficulty === 'Easy');
    if (firstEasy) {
      setCurrentIdx(set.questions.indexOf(firstEasy));
      setSelectedDifficulty('Easy');
      setCode(initialProgress.draftCodes?.[firstEasy.id] || firstEasy.starterCode);
    }
  };

  const handleSelectQuestion = (q: Question) => {
    if (!activeSet || !progress) return;
    setCurrentIdx(activeSet.questions.indexOf(q));
    setLastResult(null);
    setStreamingFeedback('');
    setRightPanelTab('diagnostic');
    setCode(progress.draftCodes?.[q.id] || q.starterCode);
  };

  const handleUnlock = async () => {
    if (!passcode) return;
    setIsUnlocking(true);
    try {
      const set = await storageService.getQuestionSetByPortal(globalProfile.masterKey, passcode);
      if (!set) alert("Invalid Portal Passcode.");
      else if (globalProfile.unlockedSets.includes(set.id)) alert("Already synchronized.");
      else {
        await storageService.unlockMissionPack(globalProfile.uid, set.id);
        setUnlockedMsg(`SUCCESS: ${set.title} Unlocked`);
        setPasscode('');
        await refreshProfile();
        setTimeout(() => setUnlockedMsg(null), 3000);
      }
    } catch (err) { alert("Portal Error."); } finally { setIsUnlocking(false); }
  };

  const handleEvaluate = async (qOverride?: Question, codeOverride?: string) => {
    if (!activeSet || !progress || (isEvaluating && !qOverride)) return;
    const currentMission = qOverride || activeSet.questions[currentIdx];
    const currentCode = codeOverride || code;
    
    setIsEvaluating(true);
    setLastResult(null);
    setStreamingFeedback('');
    setRightPanelTab('diagnostic');
    
    let accumulatedText = '';
    try {
      const responseStream = await evaluateCodeStream(activeSet.language, currentMission.description, currentCode);
      
      for await (const chunk of responseStream) {
        const text = chunk.text;
        accumulatedText += text;
        const visibleText = accumulatedText.split('[DATA]')[0];
        setStreamingFeedback(visibleText);
      }

      const dataMatch = accumulatedText.match(/\[DATA\]([\s\S]*?)\[\/DATA\]/);
      if (dataMatch) {
        const result: AIResponse = JSON.parse(dataMatch[1]);
        const earnedPoints = result.success ? currentMission.points : 0;
        setLastResult({ ...result, score: earnedPoints });

        const newFeedback: FeedbackEntry = {
          timestamp: Date.now(),
          questionId: currentMission.id,
          success: result.success,
          score: earnedPoints,
          feedback: result.feedback || streamingFeedback
        };

        const isNewCompletion = result.success && !progress.completedQuestions.includes(currentMission.id);
        const newProgress: StudentProgress = {
          ...progress,
          completedQuestions: isNewCompletion ? [...progress.completedQuestions, currentMission.id] : progress.completedQuestions,
          scores: { ...progress.scores, [currentMission.id]: Math.max(progress.scores[currentMission.id] || 0, earnedPoints) },
          draftCodes: { ...(progress.draftCodes || {}), [currentMission.id]: currentCode },
          feedbackHistory: [newFeedback, ...(progress.feedbackHistory || [])].slice(0, 15),
          lastActive: Date.now()
        };
        
        setProgress(newProgress);
        await storageService.saveProgress(newProgress);
        if (result.success) await refreshProfile();
        
        return result;
      }
    } catch (error) {
      console.error('AI evaluation failed.', error);
      setStreamingFeedback('Uplink Interrupted. Please check logic and retry.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSyncAllStaged = async () => {
    if (!activeSet || !progress || isSyncingAll) return;
    
    const stagedQuestions = activeSet.questions.filter(q => 
      progress.draftCodes?.[q.id] && 
      progress.draftCodes[q.id].trim() !== q.starterCode.trim() &&
      !progress.completedQuestions.includes(q.id)
    );

    if (stagedQuestions.length === 0) {
      alert("No pending drafts detected in the staging buffer.");
      return;
    }

    setIsSyncingAll(true);
    setRightPanelTab('diagnostic');

    for (const q of stagedQuestions) {
      // Set the active question so user can see progress
      handleSelectQuestion(q);
      const result = await handleEvaluate(q, progress.draftCodes?.[q.id]);
      
      // Stop batch processing if a failure occurs to let user see feedback
      if (!result || !result.success) {
        setIsSyncingAll(false);
        return;
      }
    }
    
    setIsSyncingAll(false);
    alert("Batch transmission complete. All staged nodes secured.");
  };

  const isDifficultyUnlocked = (diff: string) => {
    if (!activeSet || !progress) return false;
    const getCount = (d: string) => activeSet.questions.filter(q => q.difficulty === d && progress.completedQuestions.includes(q.id)).length;
    if (diff === 'Easy') return true;
    if (diff === 'Medium') return getCount('Easy') >= (activeSet.unlockEasyToMedium ?? 3);
    if (diff === 'Hard') return getCount('Medium') >= (activeSet.unlockMediumToHard ?? 3);
    if (diff === 'Challenging') return getCount('Hard') >= (activeSet.unlockHardToChallenging ?? 2);
    return false;
  };

  const getStagedCount = () => {
    if (!activeSet || !progress) return 0;
    return activeSet.questions.filter(q => 
      progress.draftCodes?.[q.id] && 
      progress.draftCodes[q.id].trim() !== q.starterCode.trim() &&
      !progress.completedQuestions.includes(q.id)
    ).length;
  };

  if (view === 'hub') {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100">
        {showTrophyRoom && <TrophyRoom profile={globalProfile} onClose={() => setShowTrophyRoom(false)} />}
        <div className="bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div><h1 className="text-3xl font-black tracking-tight uppercase">Mission Hub</h1><p className="text-indigo-600 dark:text-indigo-400 font-black uppercase text-[10px] tracking-widest mt-1">EXPLORER: {globalProfile.name}</p></div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-4"><p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Mastery</p><div className="flex items-center gap-3"><span className="text-2xl font-black text-slate-900 dark:text-white">{globalProfile.globalXp.toLocaleString()}</span><span className="text-[9px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded font-black uppercase">XP</span></div></div>
            <button onClick={() => setShowTrophyRoom(true)} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-indigo-500 transition-all group shadow-sm dark:shadow-xl" title="Trophy Room"><ICONS.Trophy className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-12 dark-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
             <div className="lg:col-span-2 space-y-12">
                <section className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 p-8 rounded-[2.5rem] relative overflow-hidden shadow-sm dark:shadow-2xl">
                   <div className="relative z-10 flex flex-col items-start gap-4">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sync Portal Key</h3>
                      <p className="text-slate-500 text-xs font-bold -mt-3">Enter the passcode provided by your Instructor.</p>
                      <div className="w-full flex gap-2"><input value={passcode} onChange={e => setPasscode(e.target.value.toUpperCase())} placeholder="PASSCODE-HERE" className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-4 py-4 rounded-2xl font-mono text-indigo-600 dark:text-indigo-400 font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" /><button onClick={handleUnlock} disabled={isUnlocking || !passcode} className="bg-indigo-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-500/20">{isUnlocking ? '...' : 'Sync'}</button></div>
                   </div>
                   {unlockedMsg && <div className="absolute inset-0 bg-green-500/90 flex items-center justify-center animate-in fade-in duration-300 z-20"><p className="text-xl font-black uppercase tracking-widest text-white">{unlockedMsg}</p></div>}
                </section>
                <section className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-white/5 pb-4">Authorized Content ({unlockedSets.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{unlockedSets.length === 0 ? <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-600 font-black uppercase text-[10px] tracking-widest">Waiting for mission sync...</div> : unlockedSets.map(set => <button key={set.id} onClick={() => handleSelectSet(set)} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-indigo-500 transition-all text-left group relative overflow-hidden hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-indigo-500/10"><div className="flex justify-between items-start mb-6"><div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform"><ICONS.Code className="w-6 h-6" /></div>{globalProfile.completedSets.includes(set.id) && <div className="bg-green-500/10 text-green-500 p-2 rounded-full"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg></div>}</div><h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{set.title}</h4><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">{set.language} • {set.questions.length} Nodes</p></button>)}</div>
                </section>
             </div>
             <div className="space-y-8"><section className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm dark:shadow-2xl"><h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-8 border-b border-slate-200 dark:border-white/5 pb-4 flex items-center gap-3"><ICONS.Trophy className="w-4 h-4 text-amber-500" /> Leaderboard</h3><div className="space-y-4">{leaderboard.map((student, idx) => { const isCurrent = student.uid === globalProfile.uid; return <div key={student.uid} className={`flex items-center gap-4 p-5 rounded-2xl transition-all ${isCurrent ? 'bg-indigo-600/10 border border-indigo-500/30' : 'bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${idx === 0 ? 'bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/30' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-orange-400 text-orange-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-600'}`}>{idx + 1}</div><div className="flex-1"><p className={`font-black text-xs uppercase tracking-tight ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>{isCurrent ? student.name : `Explorer #${idx + 1}`}</p><p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{student.globalXp.toLocaleString()} XP</p></div></div>; })}</div></section></div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeSet || !progress) return null;
  const currentMission = activeSet.questions[currentIdx];
  const setTotalXp = Object.values(progress.scores).reduce((acc: number, v: any) => acc + (v || 0), 0);
  const setCompletionPercentage = Math.round((progress.completedQuestions.length / activeSet.questions.length) * 100);
  const stagedCount = getStagedCount();

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-white dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-slate-100 relative">
      <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-white/5 flex flex-col flex-none">
        <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 flex justify-between items-center"><div><button onClick={() => setView('hub')} className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mb-2">← Exit Core</button><h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest truncate w-48">{activeSet.title}</h2></div></div>
        <div className="px-6 py-6 border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900/20"><div className="flex justify-between items-end mb-2"><p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Protocol Progress</p><p className="text-[10px] font-black text-slate-900 dark:text-white">{setCompletionPercentage}%</p></div><div className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-700" style={{ width: `${setCompletionPercentage}%` }}></div></div><div className="flex justify-between items-center mt-3"><span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Node XP</span><span className="text-sm font-black text-slate-900 dark:text-white">{setTotalXp}</span></div></div>
        
        {stagedCount > 0 && (
          <button 
            onClick={handleSyncAllStaged}
            disabled={isSyncingAll}
            className="m-4 bg-orange-100 dark:bg-orange-600/20 border border-orange-200 dark:border-orange-500/30 p-3 rounded-xl flex items-center justify-between group hover:bg-orange-200 dark:hover:bg-orange-600/30 transition-all"
          >
            <div className="flex flex-col items-start">
               <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Buffer Status</span>
               <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{stagedCount} Nodes Staged</span>
            </div>
            <div className={`p-2 bg-orange-600 text-white rounded-lg group-hover:scale-110 transition-transform ${isSyncingAll ? 'animate-pulse' : ''}`}>
              <ICONS.Globe className="w-3.5 h-3.5" />
            </div>
          </button>
        )}

        <div className="flex border-b border-slate-200 dark:border-white/5">{difficulties.map(diff => { const unlocked = isDifficultyUnlocked(diff); return <button key={diff} disabled={!unlocked} onClick={() => { setSelectedDifficulty(diff); const first = activeSet.questions.find(q => q.difficulty === diff); if (first) handleSelectQuestion(first); }} className={`flex-1 py-4 text-[8px] font-black uppercase tracking-widest transition-all relative border-r border-slate-200 dark:border-white/5 last:border-0 group ${selectedDifficulty === diff ? 'text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-600/10' : unlocked ? 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400' : 'text-slate-300 dark:text-slate-800 opacity-40'}`}><span className="block truncate px-1">{diff}</span>{selectedDifficulty === diff && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}</button>; })}</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 dark-scrollbar">
          {activeSet.questions.filter(q => q.difficulty === selectedDifficulty).map((q, idx) => {
            const isCompleted = progress.completedQuestions.includes(q.id);
            const isStaged = progress.draftCodes?.[q.id] && progress.draftCodes[q.id].trim() !== q.starterCode.trim() && !isCompleted;
            
            return (
              <button key={q.id} onClick={() => handleSelectQuestion(q)} className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ${currentMission.id === q.id ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-200 dark:border-indigo-500/50 text-indigo-900 dark:text-white shadow-sm dark:shadow-lg' : 'bg-transparent border-slate-100 dark:border-white/5 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900'}`}><div className="flex items-center gap-3"><span className="text-[10px] font-mono opacity-30">{idx + 1}</span><div><p className="font-black text-xs uppercase tracking-tight truncate w-36">{q.title}</p><p className="text-[9px] text-slate-400 dark:text-slate-700 font-black uppercase">{q.points} XP</p></div></div>
                {isCompleted ? (
                  <div className="bg-green-500 text-white rounded-full p-1"><svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg></div>
                ) : isStaged ? (
                  <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5 flex-none max-h-[35vh] overflow-y-auto dark-scrollbar flex justify-between items-start">
          <div className="max-w-4xl">
            <h3 className="text-xl font-black uppercase tracking-tight mb-3 text-slate-900 dark:text-white">{currentMission.title}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap font-medium">{currentMission.description}</p>
          </div>
          <div className="flex gap-2">
            <button 
              disabled={currentIdx === 0}
              onClick={() => handleSelectQuestion(activeSet.questions[currentIdx - 1])}
              className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 text-slate-600 dark:text-slate-300"
            >
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </button>
            <button 
              disabled={currentIdx === activeSet.questions.length - 1}
              onClick={() => handleSelectQuestion(activeSet.questions[currentIdx + 1])}
              className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 text-slate-600 dark:text-slate-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-white/5 relative">
             <div className="bg-slate-50 dark:bg-slate-950 px-6 py-2.5 text-[9px] font-black text-slate-400 dark:text-slate-600 border-b border-slate-200 dark:border-white/5 flex justify-between items-center uppercase tracking-[0.2em]"><div><span className="text-indigo-600 dark:text-indigo-400">{activeSet.language}</span> ENVIRONMENT {isSaving && <span className="text-indigo-500 animate-pulse ml-3">● Staging...</span>}</div>{progress.completedQuestions.includes(currentMission.id) && <span className="text-green-600 dark:text-green-500">Node Status: Secured</span>}</div>
             <textarea value={code} onChange={e => setCode(e.target.value)} className="flex-1 w-full bg-white dark:bg-slate-950 p-8 font-mono text-slate-800 dark:text-indigo-100/80 resize-none outline-none leading-relaxed text-sm dark-scrollbar selection:bg-indigo-500/30" spellCheck={false} />
             <div className="absolute bottom-8 right-8 flex gap-4">
                <button 
                  onClick={() => {
                    if (currentIdx < activeSet.questions.length - 1) {
                      handleSelectQuestion(activeSet.questions[currentIdx + 1]);
                    } else {
                      setView('hub');
                    }
                  }}
                  className="px-6 py-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  Stage & Next
                </button>
                <button onClick={() => handleEvaluate()} disabled={isEvaluating} className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-2xl shadow-indigo-500/20 active:scale-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 uppercase text-[10px] tracking-[0.2em] transition-all">
                  {isEvaluating ? 'Transmitting...' : 'Uplink Node'}
                </button>
             </div>
          </div>
          <div className="w-full md:w-[400px] bg-slate-50 dark:bg-slate-950 flex flex-col">
            <div className="flex border-b border-slate-200 dark:border-white/5">
              <button onClick={() => setRightPanelTab('diagnostic')} className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest ${rightPanelTab === 'diagnostic' ? 'text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-600/10' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>Diagnostic</button>
              <button onClick={() => setRightPanelTab('history')} className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest ${rightPanelTab === 'history' ? 'text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-600/10' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>History</button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto space-y-6 dark-scrollbar">
              {rightPanelTab === 'diagnostic' ? (
                (isEvaluating || streamingFeedback) ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,1)]"></div>
                      <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Neural Stream</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-wrap italic selection:bg-indigo-500/20">
                      {streamingFeedback || "Waiting for packet arrival..."}
                    </div>
                  </div>
                ) : !lastResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Awaiting Signal...</div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 border-t border-slate-200 dark:border-white/5 pt-8">
                    <div className="flex items-center justify-between mb-8">
                      <span className={`text-sm font-black uppercase tracking-[0.2em] ${lastResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{lastResult.success ? 'Integrity Clear' : 'Logic Mismatch'}</span>
                      {lastResult.success && <span className="text-2xl font-black text-slate-900 dark:text-white">{lastResult.score} XP</span>}
                    </div>
                    {lastResult.success && (
                      <button onClick={() => {
                          const visible = activeSet.questions.filter(q => q.difficulty === selectedDifficulty);
                          const nextIdxInDiff = visible.findIndex(q => q.id === currentMission.id) + 1;
                          if (nextIdxInDiff < visible.length) {
                            handleSelectQuestion(visible[nextIdxInDiff]);
                          } else {
                            const nextGlobalIdx = currentIdx + 1;
                            if (nextGlobalIdx < activeSet.questions.length) {
                               const nextQ = activeSet.questions[nextGlobalIdx];
                               if (isDifficultyUnlocked(nextQ.difficulty)) {
                                 setSelectedDifficulty(nextQ.difficulty as any);
                                 handleSelectQuestion(nextQ);
                               } else {
                                 setView('hub');
                               }
                            } else {
                               setView('hub');
                            }
                          }
                        }}
                        className="w-full py-5 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20"
                      >Advance Sequence →</button>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {progress.feedbackHistory?.length === 0 ? (
                    <div className="py-20 text-center text-slate-300 dark:text-slate-700 text-[10px] font-black uppercase tracking-widest">No previous logs.</div>
                  ) : (
                    progress.feedbackHistory?.map((entry, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/30 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`text-[8px] font-black uppercase ${entry.success ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>{entry.success ? 'Success' : 'Failed'}</span>
                          <span className="text-[8px] text-slate-400 dark:text-slate-600 font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic line-clamp-3">"{entry.feedback}"</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
