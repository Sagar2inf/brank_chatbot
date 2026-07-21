export default function ChatHeader({ activeSession, provider, setProvider }) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-300">
          {activeSession ? (activeSession.title || "Active Chat") : "Select or create a conversation"}
        </span>
      </div>

      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
        <span className="text-xs text-slate-400 font-medium">Model:</span>
        <select 
          value={provider} 
          onChange={(e) => setProvider(e.target.value)}
          className="bg-transparent text-xs font-semibold text-indigo-300 outline-none cursor-pointer pr-1"
        >
          <option value="groq" className="bg-slate-900 text-slate-200">Groq (Llama 3.3 70B)</option>
          <option value="gemini" className="bg-slate-900 text-slate-200">Google (Gemini 2.5 Flash)</option>
        </select>
      </div>
    </header>
  );
}