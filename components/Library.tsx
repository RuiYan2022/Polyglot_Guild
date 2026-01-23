
import React, { useState, useEffect } from 'react';
import { QuestionSet } from '../types';
import { storageService } from '../services/storageService';
import { ICONS } from '../constants';

interface LibraryProps {
  currentTeacherId: string;
  onImport: () => void;
}

const Library: React.FC<LibraryProps> = ({ currentTeacherId, onImport }) => {
  const [publicSets, setPublicSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSets = async () => {
      const sets = await storageService.getPublicQuestionSets();
      setPublicSets(sets);
      setLoading(false);
    };
    fetchSets();
  }, []);

  const handleImport = async (setId: string) => {
    await storageService.cloneQuestionSet(setId, currentTeacherId);
    onImport();
  };

  if (loading) return <div className="text-center py-20 animate-pulse text-slate-400">Scanning global archives...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">The Great Library</h2>
          <p className="text-indigo-100 max-w-lg">Discover high-quality mission packs shared by educators around the globe. Clone them to your academy in one click.</p>
        </div>
        <ICONS.Globe className="absolute -right-8 -bottom-8 w-64 h-64 text-white opacity-10 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {publicSets.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400">No public missions shared yet. Be the first!</div>
        ) : (
          publicSets.map(set => (
            <div key={set.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">{set.language}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">By {set.authorName}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{set.title}</h3>
              <p className="text-slate-500 text-sm mb-6 flex-1 line-clamp-3">{set.description}</p>
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                  <ICONS.Terminal className="w-4 h-4" />
                  {set.questions.length} Missions
                </div>
                <button 
                  onClick={() => handleImport(set.id)}
                  disabled={set.teacherId === currentTeacherId}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 disabled:opacity-0 transition-all"
                >
                  Import Set
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Library;