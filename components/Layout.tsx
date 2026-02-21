
import React from 'react';
import { ICONS } from '../constants';
import { useTheme } from '../src/context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  user?: { name: string; role: string };
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm dark:shadow-2xl flex-none">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <ICONS.Code className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-600 dark:to-violet-400 bg-clip-text text-transparent tracking-tight">
              POLYGLOT GUILD
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Firebase Online</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-white/10 pl-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gemini-3-Flash Connected</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-500 dark:text-slate-400"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <ICONS.Moon className="w-5 h-5" /> : <ICONS.Sun className="w-5 h-5" />}
          </button>

          {user && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{user.name}</p>
                <p className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-black">{user.role}</p>
              </div>
              <button 
                onClick={onLogout}
                className="px-4 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all uppercase tracking-widest border border-slate-200 dark:border-white/5 hover:border-red-500/50 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {children}
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 py-3 px-6 text-center text-slate-400 dark:text-slate-600 text-[8px] uppercase font-black tracking-[0.2em] flex-none">
        &copy; {new Date().getFullYear()} POLYGLOT GUILD ACADEMY • INTERNAL SECURITY CLEARANCE REQUIRED
      </footer>
    </div>
  );
};

export default Layout;
