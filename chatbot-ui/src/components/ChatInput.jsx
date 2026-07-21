export default function ChatInput({ input, setInput, sendMessage, cancelGeneration, isStreaming, activeSession }) {
  return (
    <div className="p-4 md:px-12 lg:px-24 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
      <form onSubmit={sendMessage} className="max-w-3xl mx-auto relative">
        <div className="relative flex items-center bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!activeSession || isStreaming}
            placeholder={activeSession ? "Send a message..." : "Create or pick a chat to begin..."}
            className="w-full bg-transparent py-3.5 pl-5 pr-14 text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50"
          />
          
          <div className="absolute right-2.5">
            {isStreaming ? (
              <button 
                type="button" 
                onClick={cancelGeneration}
                className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-xl transition text-xs font-medium flex items-center gap-1 active:scale-95"
                title="Cancel response"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={!activeSession || !input.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition disabled:opacity-30 disabled:hover:bg-indigo-600 active:scale-95 shadow-md shadow-indigo-600/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-center text-slate-500 mt-2">
          Powered by Redis pub/sub ingestion & FastAPI WebSockets.
        </p>
      </form>
    </div>
  );
}