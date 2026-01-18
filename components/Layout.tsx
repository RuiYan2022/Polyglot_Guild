
import React from 'react';
import { ICONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  user?: { name: string; role: string };
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm flex-none">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <ICONS.Code className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            The Polyglot Guild
          </h1>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{user.role}</p>
            </div>
            <button 
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-4 px-6 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest flex-none">
        &copy; {new Date().getFullYear()} The Polyglot Guild Academy Model. For Internal Educational Use.
      </footer>
    </div>
  );
};

export default Layout;