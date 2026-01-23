
import React, { useState } from 'react';
import { ProgrammingLanguage, Question, QuestionSet } from '../types';
import { generateMissions } from '../services/geminiService';
import { LANGUAGES, ICONS } from '../constants';

interface MissionLabProps {
  teacherId: string;
  authorName: string;
  initialSet?: QuestionSet;
  onSave: (set: QuestionSet) => void;
  onCancel: () => void;
}

type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Challenging';

const MissionLab: React.FC<MissionLabProps> = ({ teacherId, authorName, initialSet, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialSet?.title || '');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<ProgrammingLanguage>(initialSet?.language || ProgrammingLanguage.PYTHON);
  const [isGenerating, setIsGenerating] = useState(false);
  const [missions, setMissions] = useState<Question[]>(initialSet?.questions || []);
  const [passcode, setPasscode] = useState(initialSet?.passcode || '');
  const [isPublic, setIsPublic] = useState(initialSet?.isPublic || false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Difficulty>('Easy');
  const [deletingQuestionIdx, setDeletingQuestionIdx] = useState<number | null>(null);
  
  // Progression gates
  const [unlockEasyToMedium, setUnlockEasyToMedium] = useState(initialSet?.unlockEasyToMedium ?? 3);
  const [unlockMediumToHard, setUnlockMediumToHard] = useState(initialSet?.unlockMediumToHard ?? 3);
  const [unlockHardToChallenging, setUnlockHardToChallenging] = useState(initialSet?.unlockHardToChallenging ?? 2);

  const difficultyOrder: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Challenging': 4 };

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    try {
      const generated = await generateMissions(topic, language);
      // Automatically assign AI generated missions to the current active tab's difficulty
      const tagged = generated.map(m => ({ ...m, difficulty: activeTab }));
      setMissions(prev => [...prev, ...tagged]);
      setTopic(''); // Clear topic after generation
    } catch (error) {
      console.error(error);
      alert('Failed to generate missions.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addManualMission = () => {
    const newMission: Question = {
      id: `q_manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: `New ${activeTab} Mission`,
      description: 'Describe the challenge objectives here...',
      starterCode: language === ProgrammingLanguage.PYTHON ? '# Start coding here...' : '// Start coding here...',
      solutionHint: 'Provide a helpful nudge for students...',
      difficulty: activeTab,
      points: activeTab === 'Easy' ? 100 : activeTab === 'Medium' ? 250 : activeTab === 'Hard' ? 500 : 1000
    };
    
    setMissions(prev => {
      const updated = [...prev, newMission];
      setEditingIdx(updated.length - 1);
      return updated;
    });
  };

  const updateMission = (index: number, updates: Partial<Question>) => {
    setMissions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const moveMission = (index: number, newDifficulty: Difficulty) => {
    updateMission(index, { difficulty: newDifficulty });
    // Note: The mission will disappear from the current filtered list due to the tab filter
  };

  const removeMission = (index: number) => {
    setMissions(prev => prev.filter((_, i) => i !== index));
    if (editingIdx === index) setEditingIdx(null);
    setDeletingQuestionIdx(null);
  };

  const handleSave = () => {
    if (!title || !passcode || missions.length === 0) {
      alert('Please fill in Title, Passcode, and add at least one Mission.');
      return;
    }

    const sortedMissions = [...missions].sort((a, b) => {
      const diffA = difficultyOrder[a.difficulty] || 0;
      const diffB = difficultyOrder[b.difficulty] || 0;
      if (diffA !== diffB) return diffA - diffB;
      return a.points - b.points;
    });

    const newSet: QuestionSet = {
      id: initialSet?.id || `set_${Date.now()}`,
      teacherId,
      authorName,
      title,
      description: initialSet?.description || `Exploring ${topic || 'Custom Missions'} in ${language}`,
      language,
      passcode: passcode.toUpperCase(),
      questions: sortedMissions,
      isPublic,
      createdAt: initialSet?.createdAt || Date.now(),
      unlockEasyToMedium: Number(unlockEasyToMedium),
      unlockMediumToHard: Number(unlockMediumToHard),
      unlockHardToChallenging: Number(unlockHardToChallenging)
    };

    onSave(newSet);
  };

  const filteredMissions = missions
    .map((m, originalIndex) => ({ ...m, originalIndex }))
    .filter(m => m.difficulty === activeTab);

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-5xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800">{initialSet ? 'Edit Mission Pack' : 'Mission Creator'}</h2>
          <p className="text-xs text-slate-500 font-medium">
            Strategic hybrid mission architect
          </p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 text-2xl leading-none">&times;</button>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mission Pack Title</label>
            <input 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Intro to Data Structures"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target Language</label>
            <select 
              value={language}
              onChange={e => setLanguage(e.target.value as ProgrammingLanguage)}
              disabled={!!initialSet}
              className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none bg-white font-bold text-indigo-600 ${!!initialSet ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <ICONS.Trophy className="w-4 h-4 text-indigo-500" />
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Global Progression Gates</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">Easy to unlock Medium</label>
                <input 
                  type="number" 
                  min="0"
                  value={unlockEasyToMedium}
                  onChange={e => setUnlockEasyToMedium(parseInt(e.target.value) || 0)}
                  className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">Medium to unlock Hard</label>
                <input 
                  type="number" 
                  min="0"
                  value={unlockMediumToHard}
                  onChange={e => setUnlockMediumToHard(parseInt(e.target.value) || 0)}
                  className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">Hard to unlock Challenging</label>
                <input 
                  type="number" 
                  min="0"
                  value={unlockHardToChallenging}
                  onChange={e => setUnlockHardToChallenging(parseInt(e.target.value) || 0)}
                  className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600"
                />
             </div>
          </div>
        </div>

        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4">
          <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <ICONS.Globe className="w-4 h-4" /> AI Mission Scout (Current Target: {activeTab})
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Recursion, For Loops, API calls..."
              className="flex-1 px-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !topic}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100"
            >
              {isGenerating ? 'Analyzing...' : 'Generate Missions'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-slate-100 pb-2">
            <div className="flex gap-2">
              {(['Easy', 'Medium', 'Hard', 'Challenging'] as Difficulty[]).map(diff => (
                <button 
                  key={diff}
                  onClick={() => {
                    setActiveTab(diff);
                    setEditingIdx(null);
                    setDeletingQuestionIdx(null);
                  }}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all ${
                    activeTab === diff ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {diff} ({missions.filter(m => m.difficulty === diff).length})
                </button>
              ))}
            </div>
            <button 
              onClick={addManualMission}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-1 px-3 py-1 bg-indigo-50 rounded-lg"
            >
              <ICONS.Plus className="w-3.5 h-3.5" /> Add New {activeTab} Mission
            </button>
          </div>

          <div className="space-y-4">
            {filteredMissions.length === 0 && (
              <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                No missions in the {activeTab} tier yet.
              </div>
            )}
            {filteredMissions.map((m) => (
              <div key={m.id} className={`p-6 rounded-2xl border transition-all ${editingIdx === m.originalIndex ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-xl bg-white' : 'border-slate-100 bg-slate-50/50 hover:border-slate-300'}`}>
                {editingIdx === m.originalIndex ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Mission Title</label>
                        <input 
                          value={m.title}
                          onChange={e => updateMission(m.originalIndex, { title: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tier Context</label>
                        <select 
                          value={m.difficulty}
                          onChange={e => updateMission(m.originalIndex, { difficulty: e.target.value as Difficulty })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-indigo-500 font-bold text-indigo-600 bg-white"
                        >
                           <option value="Easy">Easy</option>
                           <option value="Medium">Medium</option>
                           <option value="Hard">Hard</option>
                           <option value="Challenging">Challenging</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Mission Objective</label>
                      <textarea 
                        value={m.description}
                        onChange={e => updateMission(m.originalIndex, { description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg outline-none h-20 resize-none font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Starter Code Template</label>
                        <textarea 
                          value={m.starterCode}
                          onChange={e => updateMission(m.originalIndex, { starterCode: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none h-32 font-mono text-xs bg-slate-900 text-slate-300 dark-scrollbar"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Success Hint</label>
                        <textarea 
                          value={m.solutionHint}
                          onChange={e => updateMission(m.originalIndex, { solutionHint: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none h-32 text-xs italic bg-amber-50/30 text-slate-600"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase block">XP Reward</label>
                         <input 
                           type="number"
                           value={m.points}
                           onChange={e => updateMission(m.originalIndex, { points: parseInt(e.target.value) || 0 })}
                           className="w-24 px-3 py-1 border rounded-lg font-black text-indigo-600"
                         />
                      </div>
                      <div className="flex items-center gap-3">
                        {deletingQuestionIdx === m.originalIndex ? (
                          <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl shadow-xl animate-in fade-in slide-in-from-right-2 border border-slate-800">
                            <span className="text-[9px] font-black text-white uppercase tracking-tighter">Destroy?</span>
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeMission(m.originalIndex); }}
                              className="bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg hover:bg-red-700"
                            >
                              Yes
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDeletingQuestionIdx(null); }}
                              className="bg-slate-700 text-slate-300 text-[9px] font-black px-3 py-1.5 rounded-lg hover:bg-slate-600"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => setDeletingQuestionIdx(m.originalIndex)}
                            className="text-red-500 text-xs font-black hover:underline uppercase p-2"
                          >
                            Delete Mission
                          </button>
                        )}
                        <button onClick={() => setEditingIdx(null)} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg">Lock Changes</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center font-black text-slate-300 text-xs shadow-sm flex-none">
                        {m.originalIndex + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-800 truncate">{m.title}</h4>
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                             m.difficulty === 'Easy' ? 'bg-green-100 text-green-600' : 
                             m.difficulty === 'Medium' ? 'bg-amber-100 text-amber-600' : 
                             m.difficulty === 'Hard' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'
                           }`}>
                             {m.difficulty}
                           </span>
                           <span className="text-[10px] text-slate-400 font-black uppercase">{m.points} XP</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="flex-1 sm:flex-none">
                        <select 
                          value={m.difficulty}
                          onChange={(e) => moveMission(m.originalIndex, e.target.value as Difficulty)}
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option disabled>Move To Tier...</option>
                          <option value="Easy">Move to Easy</option>
                          <option value="Medium">Move to Medium</option>
                          <option value="Hard">Move to Hard</option>
                          <option value="Challenging">Move to Challenging</option>
                        </select>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingIdx(m.originalIndex);
                          setDeletingQuestionIdx(null);
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
                      >
                        Edit Details
                      </button>

                      {deletingQuestionIdx === m.originalIndex ? (
                        <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl shadow-xl animate-in fade-in slide-in-from-right-2 border border-slate-800">
                          <span className="text-[8px] font-black text-white uppercase tracking-tighter">Remove?</span>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeMission(m.originalIndex); }}
                            className="bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded hover:bg-red-700 transition-all"
                          >
                            Yes
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeletingQuestionIdx(null); }}
                            className="bg-slate-700 text-slate-300 text-[8px] font-black px-2 py-1 rounded hover:bg-slate-600 transition-all"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeletingQuestionIdx(m.originalIndex); }} 
                          className="p-2 text-slate-300 hover:text-red-600 transition-all rounded-lg hover:bg-red-50 flex-none"
                          title="Delete Mission"
                        >
                          <ICONS.Trash className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Portal Passcode</label>
            <input 
              value={passcode}
              onChange={e => setPasscode(e.target.value.toUpperCase())}
              placeholder="e.g. MISSION-ALPHA"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold text-indigo-600 uppercase"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
            <input 
              type="checkbox" 
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-bold text-slate-700">Publish to Global Library</span>
              <p className="text-[10px] text-slate-400">Collaborate with the worldwide Guild community.</p>
            </div>
          </label>
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-4">
        <button onClick={onCancel} className="px-6 py-3 text-slate-500 font-bold text-sm">Discard</button>
        <button 
          onClick={handleSave}
          disabled={missions.length === 0}
          className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {initialSet ? 'Sync Updates' : 'Deploy Mission Pack'}
        </button>
      </div>
    </div>
  );
};

export default MissionLab;