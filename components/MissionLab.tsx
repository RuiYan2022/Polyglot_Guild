
import React, { useState, useEffect } from 'react';
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

const MissionLab: React.FC<MissionLabProps> = ({ teacherId, authorName, initialSet, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialSet?.title || '');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<ProgrammingLanguage>(initialSet?.language || ProgrammingLanguage.PYTHON);
  const [isGenerating, setIsGenerating] = useState(false);
  const [missions, setMissions] = useState<Question[]>(initialSet?.questions || []);
  const [passcode, setPasscode] = useState(initialSet?.passcode || '');
  const [isPublic, setIsPublic] = useState(initialSet?.isPublic || false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const difficultyOrder: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    try {
      const generated = await generateMissions(topic, language);
      setMissions([...missions, ...generated]);
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
      title: 'New Manual Mission',
      description: 'Describe the challenge objectives here...',
      starterCode: language === ProgrammingLanguage.PYTHON ? '# Start coding here...' : '// Start coding here...',
      solutionHint: 'A helpful nudge...',
      difficulty: 'Easy',
      points: 100
    };
    setMissions([...missions, newMission]);
    setEditingIdx(missions.length);
  };

  const updateMission = (index: number, updates: Partial<Question>) => {
    const updated = [...missions];
    updated[index] = { ...updated[index], ...updates };
    setMissions(updated);
  };

  const removeMission = (index: number) => {
    if (window.confirm("Are you sure you want to remove this mission?")) {
      setMissions(missions.filter((_, i) => i !== index));
      if (editingIdx === index) setEditingIdx(null);
    }
  };

  const handleSave = () => {
    if (!title || !passcode || missions.length === 0) {
      alert('Please fill in Title, Passcode, and add at least one Mission.');
      return;
    }

    // Auto-sort by difficulty before saving
    const sortedMissions = [...missions].sort((a, b) => {
      const diffA = difficultyOrder[a.difficulty] || 0;
      const diffB = difficultyOrder[b.difficulty] || 0;
      if (diffA !== diffB) return diffA - diffB;
      return a.points - b.points; // Secondary sort by points
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
      createdAt: initialSet?.createdAt || Date.now()
    };

    onSave(newSet);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-5xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800">{initialSet ? 'Edit Mission Pack' : 'Mission Creator'}</h2>
          <p className="text-xs text-slate-500 font-medium">
            {initialSet ? `Updating "${initialSet.title}"` : 'Hybrid AI & Manual Mission Lab'}
          </p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 text-2xl leading-none">&times;</button>
      </div>

      <div className="p-8 space-y-8">
        {/* Basic Config */}
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

        {/* AI Generator */}
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4">
          <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <ICONS.Globe className="w-4 h-4" /> AI Mission Scout
          </label>
          <p className="text-[10px] text-indigo-600/70 font-medium">Add missions of varying difficulties for automated tier progression.</p>
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
              {isGenerating ? 'Generating...' : 'Scout with AI'}
            </button>
          </div>
        </div>

        {/* Mission List */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Challenges ({missions.length})</h3>
            <button 
              onClick={addManualMission}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <ICONS.Plus className="w-3.5 h-3.5" /> Add Manual Mission
            </button>
          </div>

          <div className="space-y-4">
            {missions.length === 0 && (
              <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                No missions yet. Students need 5 completed missions to unlock the next difficulty tier.
              </div>
            )}
            {missions.map((m, idx) => (
              <div key={m.id} className={`p-6 rounded-2xl border transition-all ${editingIdx === idx ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-xl' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                {editingIdx === idx ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Mission Title</label>
                        <input 
                          value={m.title}
                          onChange={e => updateMission(idx, { title: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Difficulty</label>
                        <select 
                          value={m.difficulty}
                          onChange={e => updateMission(idx, { difficulty: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-lg outline-none"
                        >
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                        </select>
                      </div>
                    </div>
                    {/* ... (rest of MissionLab edit fields same as before) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Mission Objective</label>
                      <textarea 
                        value={m.description}
                        onChange={e => updateMission(idx, { description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg outline-none h-20 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Starter Code</label>
                        <textarea 
                          value={m.starterCode}
                          onChange={e => updateMission(idx, { starterCode: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none h-32 font-mono text-xs bg-slate-900 text-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Success Hint</label>
                        <textarea 
                          value={m.solutionHint}
                          onChange={e => updateMission(idx, { solutionHint: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none h-32 text-xs italic"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase block">XP Reward</label>
                           <input 
                             type="number"
                             value={m.points}
                             onChange={e => updateMission(idx, { points: parseInt(e.target.value) || 0 })}
                             className="w-24 px-3 py-1 border rounded-lg font-bold text-indigo-600"
                           />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => removeMission(idx)} className="text-red-500 text-xs font-bold hover:underline">Remove</button>
                        <button onClick={() => setEditingIdx(null)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Done</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center font-black text-slate-300 text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{m.title}</h4>
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                             m.difficulty === 'Easy' ? 'bg-green-100 text-green-600' : 
                             m.difficulty === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                           }`}>
                             {m.difficulty}
                           </span>
                           <span className="text-[10px] text-slate-400 font-black uppercase">{m.points} XP</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingIdx(idx)}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Global Config */}
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
              <span className="text-sm font-bold text-slate-700">Global Library Release</span>
              <p className="text-[10px] text-slate-400">Share with other Guild Masters.</p>
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
          {initialSet ? 'Update Mission Pack' : 'Publish Mission Pack'}
        </button>
      </div>
    </div>
  );
};

export default MissionLab;
