
// Updated StudentPortal to anonymize other students in the Hall of Fame for privacy.
import React, { useState, useEffect, useRef } from 'react';
import { QuestionSet, StudentProgress, AIResponse, StudentProfile, ProgrammingLanguage, Question } from '../types';
import { evaluateCode } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { ICONS } from '../constants';
import TrophyRoom from './TrophyRoom';

interface StudentPortalProps {
  profile: StudentProfile;
  onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ profile, onLogout }) => {
  // Views: 'hub' or 'editor'
  const [view, setView] = useState<'hub' | 'editor'>('hub');
  const [activeSet, setActiveSet] = useState<QuestionSet | null>(null);
  const [unlockedSets, setUnlockedSets] = useState<QuestionSet[]>([]);
  const [leaderboard, setLeaderboard] = useState<StudentProfile[]>([]);
  
  // Editor State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [code, setCode] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastResult, setLastResult] = useState<AIResponse | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Challenging'>('Easy');
  
  // UI State
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

  useEffect(() => {
    if (view === 'editor' && progress && activeSet) {
      const currentQ = activeSet.questions[currentIdx];
      
      const updatedProgress = {
        ...progress,
        draftCodes: {
          ...(progress.draftCodes || {}),
          [currentQ.id]: code
        }
      };
      
      setProgress(updatedProgress);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        await storageService.saveProgress(updatedProgress);
        setIsSaving(false);
      }, 2000);
    }
  }, [code]);

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
      lastActive: Date.now(),
      language: set.language
    };

    setProgress(initialProgress);
    setView('editor');
    
    const firstEasy = set.questions.find(q => q.difficulty === 'Easy');
    if (firstEasy) {
      const qIdx = set.questions.indexOf(firstEasy);
      setCurrentIdx(qIdx);
      setSelectedDifficulty('Easy');
      const saved = initialProgress.draftCodes?.[firstEasy.id];
      setCode(saved || firstEasy.starterCode);
    }
  };

  const handleSelectQuestion = (q: Question) => {
    if (!activeSet || !progress) return;
    const newIdx = activeSet.questions.indexOf(q);
    setCurrentIdx(newIdx);
    setLastResult(null);
    const savedCode = progress.draftCodes?.[q.id];
    setCode(savedCode || q.starterCode);
  };

  const handleUnlock = async () => {
    if (!passcode) return;
    setIsUnlocking(true);
    try {
      const set = await storageService.getQuestionSetByPortal(globalProfile.masterKey, passcode);
      if (!set) {
        alert("Invalid Portal Passcode. Access Denied.");
      } else if (globalProfile.unlockedSets.includes(set.id)) {
        alert("Mission Pack already synchronized.");
      } else {
        await storageService.unlockMissionPack(globalProfile.uid, set.id);
        setUnlockedMsg(`SUCCESS: ${set.title} Unlocked`);
        setPasscode('');
        await refreshProfile();
        setTimeout(() => setUnlockedMsg(null), 3000);
      }
    } catch (err) {
      alert("Portal Error: Connection unstable.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleEvaluate = async () => {
    if (!activeSet || !progress || isEvaluating) return;
    const currentMission = activeSet.questions[currentIdx];
    setIsEvaluating(true);
    setLastResult(null);
    try {
      const result = await evaluateCode(activeSet.language, currentMission.description, code);
      const earnedPoints = result.success ? currentMission.points : 0;
      setLastResult({ ...result, score: earnedPoints });
      
      if (result.success) {
        const isNewCompletion = !progress.completedQuestions.includes(currentMission.id);
        const newCompleted = isNewCompletion ? [...progress.completedQuestions, currentMission.id] : progress.completedQuestions;
        
        const newProgress = {
          ...progress,
          completedQuestions: newCompleted,
          scores: { ...progress.scores, [currentMission.id]: earnedPoints },
          draftCodes: { ...(progress.draftCodes || {}), [currentMission.id]: code },
          lastActive: Date.now()
        };
        
        setProgress(newProgress);
        await storageService.saveProgress(newProgress);
        await refreshProfile();
      }
    } catch (error) {
      alert('AI evaluation failed.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const isDifficultyUnlocked = (diff: string) => {
    if (!activeSet || !progress) return false;
    const getCount = (d: string) => activeSet.questions.filter(q => q.difficulty === d && progress.completedQuestions.includes(q.id)).length;
    
    if (diff === 'Easy') return true;
    if (diff === 'Medium') {
      const needed = activeSet.unlockEasyToMedium ?? 3;
      return getCount('Easy') >= needed;
    }
    if (diff === 'Hard') {
      const needed = activeSet.unlockMediumToHard ?? 3;
      return getCount('Medium') >= needed;
    }
    if (diff === 'Challenging') {
      const needed = activeSet.unlockHardToChallenging ?? 2;
      return getCount('Hard') >= needed;
    }
    return false;
  };

  const getCompletedCountByDiff = (diff: string) => {
    if (!activeSet || !progress) return 0;
    return activeSet.questions.filter(q => q.difficulty === diff && progress.completedQuestions.includes(q.id)).length;
  };

  if (view === 'hub') {
    return (
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden text-slate-100">
        {showTrophyRoom && <TrophyRoom profile={globalProfile} onClose={() => setShowTrophyRoom(false)} />}
        
        <div className="bg-slate-900/50 border-b border-white/5 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Mission Hub</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Explorer Index: {globalProfile.name}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Global Standing</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-indigo-400">{globalProfile.globalXp.toLocaleString()}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded font-black uppercase">XP Total</span>
              </div>
            </div>
            <button 
              onClick={() => setShowTrophyRoom(true)} 
              className="bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all group"
              title="View Chamber of Trophies"
            >
              <ICONS.Trophy className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={onLogout}
              className="bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:border-red-500 hover:bg-red-500/10 transition-all text-slate-400 hover:text-red-500"
              title="Terminate Session"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-12 dark-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
             <div className="lg:col-span-2 space-y-12">
                <section className="bg-indigo-900/10 border border-indigo-500/20 p-8 rounded-[2.5rem] relative overflow-hidden">
                   <div className="relative z-10 flex flex-col items-start gap-4">
                      <h3 className="text-xl font-black text-white">Initialize Portal Code</h3>
                      <div className="w-full flex gap-2">
                         <input 
                           value={passcode}
                           onChange={e => setPasscode(e.target.value.toUpperCase())}
                           placeholder="PASSCODE-HERE"
                           className="flex-1 bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl font-mono text-indigo-400 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                         />
                         <button onClick={handleUnlock} disabled={isUnlocking || !passcode} className="bg-indigo-600 px-6 py-3 rounded-xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50">
                           {isUnlocking ? '...' : 'Unlock'}
                         </button>
                      </div>
                   </div>
                   {unlockedMsg && <div className="absolute inset-0 bg-green-500/90 flex items-center justify-center animate-in fade-in duration-300"><p className="text-xl font-black">{unlockedMsg}</p></div>}
                </section>

                <section className="space-y-6">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-4">Synchronized Content ({unlockedSets.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {unlockedSets.length === 0 ? (
                      <div className="col-span-full py-20 text-center bg-slate-900/40 rounded-[2rem] border border-dashed border-slate-800 text-slate-500 italic">
                        No mission packs synchronized. Enter a Portal Code to begin.
                      </div>
                    ) : (
                      unlockedSets.map(set => (
                        <button key={set.id} onClick={() => handleSelectSet(set)} className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 hover:border-indigo-500 transition-all text-left group">
                          <div className="flex justify-between items-start mb-6">
                            <div className="bg-slate-800 p-3 rounded-xl text-indigo-400"><ICONS.Code className="w-6 h-6" /></div>
                            {globalProfile.completedSets.includes(set.id) && <div className="bg-green-500/10 text-green-500 p-2 rounded-full"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg></div>}
                          </div>
                          <h4 className="text-xl font-black text-white mb-2 group-hover:text-indigo-400 transition-colors">{set.title}</h4>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{set.language} • {set.questions.length} Challenges</p>
                        </button>
                      ))
                    )}
                  </div>
                </section>
             </div>

             <div className="space-y-8">
                <section className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 border-b border-slate-800 pb-4 flex items-center gap-2">
                      <ICONS.Trophy className="w-4 h-4 text-amber-500" /> Hall of Fame
                   </h3>
                   <div className="space-y-4">
                      {leaderboard.map((student, idx) => {
                        const isCurrent = student.uid === globalProfile.uid;
                        // Anonymization logic: If it's not the current student, hide the name.
                        const displayName = isCurrent ? student.name : `Anonymous Explorer #${idx + 1}`;
                        
                        return (
                          <div key={student.uid} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isCurrent ? 'bg-indigo-600/10 border border-indigo-500/20' : 'bg-slate-950/50 border border-white/5'}`}>
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                               idx === 0 ? 'bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20' :
                               idx === 1 ? 'bg-slate-300 text-slate-900' :
                               idx === 2 ? 'bg-orange-400 text-orange-950' : 'bg-slate-800 text-slate-500'
                             }`}>
                               {idx + 1}
                             </div>
                             <div className="flex-1">
                                <p className={`font-black text-sm ${isCurrent ? 'text-indigo-400' : 'text-slate-200'}`}>{displayName}</p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{student.globalXp.toLocaleString()} XP</p>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </section>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeSet || !progress) return null;
  const currentMission = activeSet.questions[currentIdx];
  const setTotalXp = Object.values(progress.scores).reduce((acc: number, v: any) => acc + (v || 0), 0);
  const setCompletionPercentage = Math.round((progress.completedQuestions.length / activeSet.questions.length) * 100);

  const getUnlockMessage = (diff: string) => {
    if (diff === 'Medium') {
      const required = activeSet.unlockEasyToMedium ?? 3;
      const easyNeeded = required - getCompletedCountByDiff('Easy');
      return easyNeeded > 0 ? `${easyNeeded} more Easy to unlock` : 'Tier Unlocked';
    }
    if (diff === 'Hard') {
      const required = activeSet.unlockMediumToHard ?? 3;
      const mediumNeeded = required - getCompletedCountByDiff('Medium');
      return mediumNeeded > 0 ? `${mediumNeeded} more Medium to unlock` : 'Tier Unlocked';
    }
    if (diff === 'Challenging') {
      const required = activeSet.unlockHardToChallenging ?? 2;
      const hardNeeded = required - getCompletedCountByDiff('Hard');
      return hardNeeded > 0 ? `${hardNeeded} more Hard to unlock` : 'Tier Unlocked';
    }
    return '';
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-900 overflow-hidden text-slate-100 relative">
      <div className="w-full md:w-80 bg-slate-950 border-r border-slate-800 flex flex-col flex-none">
        <div className="p-6 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
          <div>
            <button onClick={() => setView('hub')} className="text-[9px] font-black uppercase text-indigo-400 hover:underline flex items-center gap-1 mb-2">← Back to Hub</button>
            <h2 className="text-md font-black text-white truncate w-48">{activeSet.title}</h2>
          </div>
        </div>

        <div className="px-6 py-6 border-b border-slate-800 bg-slate-900/20">
            <div className="flex justify-between items-end mb-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Set Completion</p>
                <p className="text-[10px] font-black text-white">{setCompletionPercentage}%</p>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-700" style={{ width: `${setCompletionPercentage}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-3">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Current XP</span>
                <span className="text-sm font-black text-white">{setTotalXp} XP</span>
            </div>
        </div>

        <div className="flex border-b border-slate-800">
          {difficulties.map(diff => {
            const unlocked = isDifficultyUnlocked(diff);
            const count = getCompletedCountByDiff(diff);
            const msg = getUnlockMessage(diff);
            const isChallenging = diff === 'Challenging';
            
            return (
              <button key={diff} disabled={!unlocked} onClick={() => {
                  setSelectedDifficulty(diff);
                  const firstOfDiff = activeSet.questions.find(q => q.difficulty === diff);
                  if (firstOfDiff) handleSelectQuestion(firstOfDiff);
                }}
                className={`flex-1 py-4 text-[9px] font-black uppercase tracking-tighter transition-all relative border-r border-slate-800 last:border-0 group ${
                  selectedDifficulty === diff 
                    ? (isChallenging ? 'text-violet-400 bg-violet-600/10' : 'text-white bg-indigo-600/10') 
                    : unlocked ? 'text-slate-500 hover:text-slate-300' : 'text-slate-800 opacity-40'
                }`}
              >
                <span className="block truncate px-1">{diff}</span>
                <span className="text-[8px] opacity-60">({count})</span>
                {!unlocked && <div className="absolute left-1/2 -translate-x-1/2 -top-10 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700 z-50 shadow-xl">{msg}</div>}
                {selectedDifficulty === diff && <div className={`absolute bottom-0 left-0 right-0 h-1 ${isChallenging ? 'bg-violet-500' : 'bg-indigo-500'}`}></div>}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 dark-scrollbar">
          {activeSet.questions.filter(q => q.difficulty === selectedDifficulty).map((q, idx) => (
            <button key={q.id} onClick={() => handleSelectQuestion(q)}
              className={`w-full text-left p-4 rounded-xl transition-all border flex justify-between items-center ${
                currentMission.id === q.id 
                  ? (selectedDifficulty === 'Challenging' ? 'bg-violet-600/20 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]')
                  : 'bg-transparent border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono opacity-50">{idx + 1}</span>
                <div>
                  <p className="font-bold text-sm truncate w-36">{q.title}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">{q.points} XP</p>
                </div>
              </div>
              {progress.completedQuestions.includes(q.id) && <div className="bg-green-500 text-white rounded-full p-1 shadow-lg shadow-green-500/20"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg></div>}
            </button>
          ))}
        </div>
        <div className="p-6 bg-slate-950/50 border-t border-slate-800 space-y-3 flex-none">
          <button onClick={() => setView('hub')} className="w-full py-4 bg-slate-800 text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700">Exit Workspace</button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 bg-slate-900 border-b border-slate-800 flex-none max-h-[35vh] overflow-y-auto dark-scrollbar">
          <h3 className="text-2xl font-bold mb-2">{currentMission.title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed max-w-4xl whitespace-pre-wrap font-medium">{currentMission.description}</p>
        </div>
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-slate-800 relative">
             <div className="bg-slate-950 px-4 py-2 text-[10px] font-mono text-slate-500 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className={`uppercase font-black text-[9px] tracking-widest ${selectedDifficulty === 'Challenging' ? 'text-violet-400' : 'text-indigo-400'}`}>{activeSet.language} COMPILER MODE</span>
                  {isSaving && <span className="text-[8px] text-slate-500 animate-pulse">● SYNCING WORK...</span>}
                  {!isSaving && <span className="text-[8px] text-green-500 opacity-50 tracking-widest uppercase">✓ WORK SECURED</span>}
                </div>
                {progress.completedQuestions.includes(currentMission.id) && <span className="text-green-500 font-black text-[8px] uppercase tracking-widest flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>Mission Cleared</span>}
             </div>
             <textarea 
               value={code} 
               onChange={e => setCode(e.target.value)} 
               className="flex-1 w-full bg-slate-950 p-8 font-mono text-slate-300 resize-none outline-none leading-relaxed text-sm dark-scrollbar" 
               spellCheck={false} 
             />
             <div className="absolute bottom-8 right-8">
                <button 
                  onClick={handleEvaluate} 
                  disabled={isEvaluating} 
                  className={`px-8 py-4 ${selectedDifficulty === 'Challenging' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-2xl font-black shadow-xl flex items-center gap-3 transition-all active:scale-95 disabled:bg-slate-700 uppercase text-xs tracking-widest`}
                >
                  {isEvaluating ? 'Analyzing Architecture...' : 'Transmit Solution'}
                </button>
             </div>
          </div>
          <div className="w-full md:w-96 bg-slate-950 flex flex-col">
            <div className="flex-1 p-6 overflow-y-auto space-y-6 dark-scrollbar">
              {!lastResult && !isEvaluating && <div className="h-full flex flex-col items-center justify-center text-center opacity-30 italic text-sm font-medium px-4">Synchronizing System... Submit code to run diagnostic evaluation.</div>}
              {lastResult && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-md font-black uppercase tracking-widest ${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>{lastResult.success ? 'INTEGRITY CLEAR' : 'LOGIC ERROR'}</span>
                    {lastResult.success && <span className="text-xl font-black text-white">{lastResult.score} XP</span>}
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed mb-6 font-medium whitespace-pre-wrap">{lastResult.feedback}</div>
                  {lastResult.success && (
                    <button onClick={() => {
                        const visible = activeSet.questions.filter(q => q.difficulty === selectedDifficulty);
                        const nextIdxInVisible = visible.findIndex(q => q.id === currentMission.id) + 1;
                        if (nextIdxInVisible < visible.length) {
                          handleSelectQuestion(visible[nextIdxInVisible]);
                        } else {
                          setView('hub');
                        }
                      }}
                      className={`w-full py-4 ${selectedDifficulty === 'Challenging' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-xl font-black transition-all text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/20`}
                    >
                      Continue Sequence →
                    </button>
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
