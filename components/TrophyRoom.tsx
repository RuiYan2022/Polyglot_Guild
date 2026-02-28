
import React from 'react';
import { StudentProfile, ProgrammingLanguage } from '../types';
import { ICONS, LANGUAGES } from '../constants';

interface TrophyRoomProps {
  profile: StudentProfile;
  onClose: () => void;
}

const TrophyRoom: React.FC<TrophyRoomProps> = ({ profile, onClose }) => {
  const getLevel = (xp: number) => Math.floor(xp / 500) + 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] transition-colors duration-300">
        {/* Left Side: Stats */}
        <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-950 p-8 flex flex-col items-center border-r border-slate-200 dark:border-slate-800">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 p-1 mb-6 relative">
             <div className="w-full h-full rounded-full bg-white dark:bg-slate-950 flex items-center justify-center">
                <ICONS.Trophy className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
             </div>
             <div className="absolute -bottom-2 right-0 bg-indigo-600 dark:bg-white text-white dark:text-slate-900 font-black px-3 py-1 rounded-full text-xs shadow-lg">
               LVL {getLevel(profile.globalXp)}
             </div>
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{profile.name}</h2>
          <p className="text-slate-500 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-8 text-center">Polyglot Architect</p>
          
          <div className="w-full space-y-4">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Total XP</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{profile.globalXp.toLocaleString()}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Missions Secured</p>
                <p className="text-2xl font-black text-violet-600 dark:text-violet-400">{profile.completedSets.length}</p>
             </div>
          </div>

          <button 
            onClick={onClose}
            className="mt-auto w-full py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold transition-all"
          >
            Close Chamber
          </button>
        </div>

        {/* Right Side: Language Mastery */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white dark:bg-slate-900">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Language Mastery</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-10">Your synchronized progress across the global tech stack.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {LANGUAGES.map(lang => {
              const xp = profile.languageMastery[lang] || 0;
              const level = getLevel(xp);
              const progressToNext = (xp % 500) / 500 * 100;
              const isActive = xp > 0;

              return (
                <div key={lang} className={`p-6 rounded-2xl border transition-all ${
                  isActive ? 'bg-indigo-50 dark:bg-indigo-600/5 border-indigo-200 dark:border-indigo-500/30' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-50'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className={`text-xl font-bold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>{lang}</h4>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Expertise Level {level}</p>
                    </div>
                    {isActive ? (
                      <ICONS.Code className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-800 border-dashed"></div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${isActive ? 'bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`}
                        style={{ width: `${isActive ? progressToNext : 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span>{xp} XP</span>
                      <span>Next Lvl: {500 - (xp % 500)} XP</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-16 mb-2">Milestone Badges</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-10">Permanent honors for your dedication and skill.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {[
              { 
                id: '7day', 
                name: '7-Day Voyager', 
                desc: 'Maintain a 7-day streak', 
                icon: ICONS.Flame, 
                achieved: profile.streak >= 7,
                color: 'text-orange-500'
              },
              { 
                id: '30day', 
                name: '30-Day Legend', 
                desc: 'Maintain a 30-day streak', 
                icon: ICONS.Flame, 
                achieved: profile.streak >= 30,
                color: 'text-red-500'
              },
              { 
                id: '10k', 
                name: '10k Club', 
                desc: 'Reach 10,000 global XP', 
                icon: ICONS.Trophy, 
                achieved: profile.globalXp >= 10000,
                color: 'text-amber-500'
              },
              { 
                id: '100k', 
                name: '100k Master', 
                desc: 'Reach 100,000 global XP', 
                icon: ICONS.Trophy, 
                achieved: profile.globalXp >= 100000,
                color: 'text-indigo-500'
              },
              { 
                id: 'speed', 
                name: 'Speed Demon', 
                desc: 'Complete 10 Overdrive sessions', 
                icon: ICONS.Zap, 
                achieved: (profile.overdriveSessionsCompleted || 0) >= 10,
                color: 'text-yellow-400'
              },
            ].map(badge => (
              <div key={badge.id} className={`flex flex-col items-center text-center p-6 rounded-3xl border transition-all ${
                badge.achieved ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900 opacity-30 grayscale'
              }`}>
                <div className={`p-4 rounded-2xl mb-4 ${badge.achieved ? 'bg-slate-50 dark:bg-slate-900' : 'bg-transparent'}`}>
                  <badge.icon className={`w-8 h-8 ${badge.color}`} />
                </div>
                <h5 className="text-[10px] font-black uppercase tracking-tight mb-1">{badge.name}</h5>
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-tight">{badge.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-12 p-8 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-6">
             <div className="p-4 bg-indigo-600 rounded-2xl">
                <ICONS.Globe className="w-8 h-8 text-white" />
             </div>
             <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Universal Synchronization</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Your achievements are shared across all Guild Academies using your Student Tag.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrophyRoom;