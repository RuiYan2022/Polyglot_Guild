
import React, { useState, useEffect } from 'react';
import { QuestionSet, StudentProgress, AIResponse, StudentProfile, ProgrammingLanguage, Question } from '../types';
import { evaluateCode } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { ICONS } from '../constants';
import TrophyRoom from './TrophyRoom';

interface StudentPortalProps {
  studentName: string;
  teacher: any;
  classId: string;
  className: string;
  activeSet: QuestionSet;
  onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ studentName, teacher, classId, className, activeSet, onLogout }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [code, setCode] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastResult, setLastResult] = useState<AIResponse | null>(null);
  const [showTrophyRoom, setShowTrophyRoom] = useState(false);
  const [globalProfile, setGlobalProfile] = useState<StudentProfile | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [unlockedMsg, setUnlockedMsg] = useState<string | null>(null);
  
  const [progress, setProgress] = useState<StudentProgress>({
    id: `p_${studentName}_${activeSet.id}`,
    studentName,
    teacherId: teacher.uid,
    classId: classId,
    questionSetId: activeSet.id,
    completedQuestions: [],
    scores: {},
    lastActive: Date.now(),
    language: activeSet.language
  });

  const difficulties: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];

  const refreshStats = async () => {
    const profile = await storageService.getGlobalStudentProfile(studentName);
    if (profile) setGlobalProfile(profile);
  };

  useEffect(() => {
    const loadData = async () => {
      const all = await storageService.getStudentProgress(studentName, teacher.uid);
      const existing = all.find(a => a.questionSetId === activeSet.id);
      if (existing) setProgress(existing);
      await refreshStats();
    };
    loadData();
  }, [studentName, activeSet.id]);

  useEffect(() => {
    const visibleMissions = activeSet.questions.filter(q => q.difficulty === selectedDifficulty);
    if (visibleMissions.length > 0) {
      setCode(visibleMissions[0].starterCode);
      setCurrentIdx(activeSet.questions.findIndex(q => q.id === visibleMissions[0].id));
    }
  }, [selectedDifficulty, activeSet.questions]);

  const currentMission = activeSet.questions[currentIdx];

  const getCompletedCountByDiff = (diff: string) => {
    return activeSet.questions.filter(q => 
      q.difficulty === diff && progress.completedQuestions.includes(q.id)
    ).length;
  };

  const isDifficultyUnlocked = (diff: string) => {
    if (diff === 'Easy') return true;
    if (diff === 'Medium') return getCompletedCountByDiff('Easy') >= 5;
    if (diff === 'Hard') return getCompletedCountByDiff('Medium') >= 5;
    return false;
  };

  const getFileExtension = (lang: ProgrammingLanguage) => {
    switch (lang) {
      case ProgrammingLanguage.PYTHON: return '.py';
      case ProgrammingLanguage.JAVASCRIPT: return '.js';
      case ProgrammingLanguage.TYPESCRIPT: return '.ts';
      case ProgrammingLanguage.JAVA: return '.java';
      case ProgrammingLanguage.CPP: return '.cpp';
      case ProgrammingLanguage.RUBY: return '.rb';
      default: return '.src';
    }
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setLastResult(null);
    try {
      const result = await evaluateCode(activeSet.language, currentMission.description, code);
      const earnedPoints = result.success ? currentMission.points : 0;
      
      setLastResult({ ...result, score: earnedPoints });
      
      if (result.success) {
        const isNewCompletion = !progress.completedQuestions.includes(currentMission.id);
        const newCompleted = isNewCompletion
          ? [...progress.completedQuestions, currentMission.id]
          : progress.completedQuestions;
        
        const newProgress = {
          ...progress,
          completedQuestions: newCompleted,
          scores: { ...progress.scores, [currentMission.id]: earnedPoints },
          lastActive: Date.now()
        };
        
        setProgress(newProgress);
        await storageService.saveProgress(newProgress);
        await refreshStats();

        if (isNewCompletion) {
          const count = activeSet.questions.filter(q => 
            q.difficulty === currentMission.difficulty && newCompleted.includes(q.id)
          ).length;

          if (count === 5) {
            if (currentMission.difficulty === 'Easy') setUnlockedMsg("MEDIUM TIER UNLOCKED!");
            if (currentMission.difficulty === 'Medium') setUnlockedMsg("HARD TIER UNLOCKED!");
            setTimeout(() => setUnlockedMsg(null), 5000);
          }
        }
      }
    } catch (error) {
      alert('AI evaluation failed. Check connectivity.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextMission = () => {
    const visibleMissions = activeSet.questions.filter(q => q.difficulty === selectedDifficulty);
    const subIdx = visibleMissions.findIndex(q => q.id === currentMission.id);
    
    if (subIdx < visibleMissions.length - 1) {
      const nextQ = visibleMissions[subIdx + 1];
      setCurrentIdx(activeSet.questions.findIndex(q => q.id === nextQ.id));
      setCode(nextQ.starterCode);
      setLastResult(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-900 overflow-hidden text-slate-100 relative">
      {showTrophyRoom && globalProfile && (
        <TrophyRoom profile={globalProfile} onClose={() => setShowTrophyRoom(false)} />
      )}

      {unlockedMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-8 py-4 rounded-full font-black text-xl shadow-[0_0_50px_rgba(34,197,94,0.5)] animate-bounce border-4 border-white">
          ✨ {unlockedMsg} ✨
        </div>
      )}

      {/* Sidebar: Tier Selection & Mission List */}
      <div className="w-full md:w-80 bg-slate-950 border-r border-slate-800 flex flex-col flex-none">
        <div className="p-6 border-b border-slate-800 bg-slate-900/40">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Class: {className}</p>
          <h2 className="text-lg font-black text-indigo-400 truncate">{activeSet.title}</h2>
        </div>

        {/* Tier Selector */}
        <div className="flex border-b border-slate-800">
          {difficulties.map(diff => {
            const unlocked = isDifficultyUnlocked(diff);
            const count = getCompletedCountByDiff(diff);
            return (
              <button
                key={diff}
                disabled={!unlocked}
                onClick={() => setSelectedDifficulty(diff)}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-tighter transition-all relative border-r border-slate-800 last:border-0 ${
                  selectedDifficulty === diff 
                  ? 'text-white bg-indigo-600/10' 
                  : unlocked ? 'text-slate-500 hover:text-slate-300' : 'text-slate-800 opacity-40'
                }`}
              >
                <span className="block">{diff}</span>
                <span className="text-[9px] opacity-60">({count}/5)</span>
                {!unlocked && <div className="absolute top-1 right-1"><svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg></div>}
                {selectedDifficulty === diff && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500"></div>}
              </button>
            );
          })}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 dark-scrollbar">
          {activeSet.questions
            .filter(q => q.difficulty === selectedDifficulty)
            .map((q, idx) => (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIdx(activeSet.questions.findIndex(mi => mi.id === q.id));
                setCode(q.starterCode);
                setLastResult(null);
              }}
              className={`w-full text-left p-4 rounded-xl transition-all border flex justify-between items-center ${
                currentMission.id === q.id 
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                : 'bg-transparent border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono opacity-50">{idx + 1}</span>
                <div>
                  <p className="font-bold text-sm truncate w-40">{q.title}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">{q.points} XP Reward</p>
                </div>
              </div>
              {progress.completedQuestions.includes(q.id) && (
                <div className="bg-green-500 text-white rounded-full p-1 shadow-[0_0_8px_rgba(34,197,94,0.4)]">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          ))}
          {activeSet.questions.filter(q => q.difficulty === selectedDifficulty).length === 0 && (
            <div className="text-center py-10 opacity-30 italic text-sm">No missions at this tier.</div>
          )}
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 space-y-3 flex-none">
          {selectedDifficulty !== 'Hard' && (
             <div className="space-y-1 mb-4">
                <div className="flex justify-between text-[8px] font-black uppercase text-slate-500">
                   <span>Next Tier Progress</span>
                   <span>{getCompletedCountByDiff(selectedDifficulty)}/5 Missions</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-indigo-500 transition-all duration-500" 
                     style={{ width: `${Math.min(100, (getCompletedCountByDiff(selectedDifficulty) / 5) * 100)}%` }}
                   ></div>
                </div>
             </div>
          )}

          <button 
            onClick={() => setShowTrophyRoom(true)}
            className="w-full flex items-center gap-3 p-4 bg-indigo-600/5 border border-indigo-500/10 rounded-xl hover:bg-indigo-600/20 transition-all group"
          >
            <div className="bg-amber-500 p-2 rounded-lg">
              <ICONS.Trophy className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Mastery Records</p>
              <p className="text-md font-black text-indigo-400 leading-tight">{globalProfile?.globalXp || 0} XP</p>
            </div>
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full py-2 text-[10px] font-bold text-slate-600 hover:text-white transition-colors border border-slate-900 rounded-lg uppercase tracking-widest"
          >
            Exit Workspace
          </button>
        </div>
      </div>

      {/* Main Content: Coding Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 bg-slate-900 border-b border-slate-800 flex-none max-h-[35vh] overflow-y-auto dark-scrollbar">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold">{currentMission.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-widest ${
                   currentMission.difficulty === 'Easy' ? 'bg-green-900/40 text-green-400 border border-green-500/20' :
                   currentMission.difficulty === 'Medium' ? 'bg-amber-900/40 text-amber-400 border border-amber-500/20' : 
                   'bg-red-900/40 text-red-400 border border-red-500/20'
                 }`}>
                   {currentMission.difficulty} Challenge
                 </span>
                 <p className="text-indigo-400 font-black text-[9px] uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Award: {currentMission.points} XP
                 </p>
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-4xl whitespace-pre-wrap">{currentMission.description}</p>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-slate-800 relative">
             <div className="bg-slate-950 px-4 py-2 text-[10px] font-mono text-slate-500 border-b border-slate-800 flex justify-between items-center">
                <span className="flex items-center gap-2 uppercase tracking-widest font-black">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  source_file{getFileExtension(activeSet.language)}
                </span>
                <span className="text-indigo-400 uppercase font-black text-[9px] tracking-widest">{activeSet.language} Mode</span>
             </div>
             <textarea 
               value={code}
               onChange={e => setCode(e.target.value)}
               className="flex-1 w-full bg-slate-950 p-8 font-mono text-slate-300 resize-none outline-none focus:ring-0 leading-relaxed text-sm dark-scrollbar"
               spellCheck={false}
               placeholder={`Execute logic in ${activeSet.language}...`}
             />
             
             <div className="absolute bottom-8 right-8">
                <button 
                  onClick={handleEvaluate}
                  disabled={isEvaluating}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-[0_0_30px_rgba(79,70,229,0.3)] flex items-center gap-3 transition-all active:scale-95 disabled:bg-slate-700 uppercase text-xs tracking-widest"
                >
                  {isEvaluating ? (
                    <span className="animate-pulse">Analyzing Payload...</span>
                  ) : (
                    <><ICONS.Terminal className="w-5 h-5" /> Run Diagnostics</>
                  )}
                </button>
             </div>
          </div>

          <div className="w-full md:w-96 bg-slate-950 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest flex-none">
              <ICONS.Globe className="w-4 h-4" /> Polyglot Engine Feed
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6 dark-scrollbar">
              {!lastResult && !isEvaluating && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-700 opacity-30">
                  <ICONS.Code className="w-12 h-12 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Waiting for code submission</p>
                </div>
              )}

              {isEvaluating && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-900 rounded-full animate-pulse w-3/4"></div>
                    <div className="h-4 bg-slate-900 rounded-full animate-pulse w-1/2"></div>
                  </div>
                  <div className="h-48 bg-slate-900/50 rounded-2xl border border-slate-800 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Scanning logic vectors...</p>
                    </div>
                  </div>
                </div>
              )}

              {lastResult && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${lastResult.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                       <span className={`text-md font-black uppercase tracking-widest ${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>
                         {lastResult.success ? 'Integrity Clear' : 'Analysis Failed'}
                       </span>
                    </div>
                    {lastResult.score !== undefined && lastResult.success && (
                      <div className="text-xl font-black text-white">{lastResult.score}<span className="text-[10px] text-slate-600 ml-1 font-black">XP</span></div>
                    )}
                  </div>

                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed mb-6 font-medium whitespace-pre-wrap">
                    {lastResult.feedback}
                  </div>

                  {lastResult.suggestions && lastResult.suggestions.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Optimization Notes</p>
                      {lastResult.suggestions.map((s, i) => (
                        <div key={i} className="flex gap-2 text-[11px] text-slate-400 italic">
                          <span className="text-indigo-500 font-bold">●</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {lastResult.success && (
                    <button 
                      onClick={nextMission}
                      className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all shadow-lg shadow-indigo-900/20 active:scale-95 text-xs uppercase tracking-widest"
                    >
                      Secure Next Objective →
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