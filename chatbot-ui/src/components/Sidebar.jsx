import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Sidebar({ sessions, activeSession, setActiveSession, createNewSession }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
      <div className="p-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-2 py-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              AI
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-wide text-white">Inference Engine</h1>
              <p className="text-xs text-slate-400">Observability Suite</p>
            </div>
          </div>
        </div>

        <button 
          onClick={createNewSession}
          className="w-full mt-2 mb-4 py-2.5 px-4 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl text-sm font-medium text-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
        >
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </button>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Past Chats</p>
          {sessions.map((sess) => {
            const isActive = activeSession?.session_id === sess.session_id;
            return (
              <button 
                key={sess.session_id}
                onClick={() => setActiveSession(sess)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-2.5 truncate ${
                  isActive 
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <svg className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="truncate">{sess.title || `Session #${sess.session_id.slice(0, 8)}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>System Status</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span> Ready
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300 truncate pr-2">@{user?.username}</span>
          <button onClick={logout} className="text-xs text-slate-400 hover:text-rose-400 transition-colors">
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}