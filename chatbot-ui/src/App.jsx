import { useState, useEffect, useRef } from 'react';

const API_BASE = "http://localhost:8000/api/chat";
const WS_BASE = "ws://localhost:8000/api/chat/stream";

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("groq");
  const [isStreaming, setIsStreaming] = useState(false);
  
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom on new tokens/messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Load Conversation List
  useEffect(() => {
    fetch(`${API_BASE}/sessions`)
      .then(res => res.json())
      .then(data => setSessions(data))
      .catch(console.error);
  }, []);

  // Load Session History
  useEffect(() => {
    if (!activeSession) return;
    
    fetch(`${API_BASE}/sessions/${activeSession.session_id}`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(console.error);
  }, [activeSession]);

  const createNewSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, { method: "POST" });
      const newSession = await res.json();
      setSessions([newSession, ...sessions]);
      setActiveSession(newSession);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeSession || isStreaming) return;

    const userContent = input.trim();
    const userMessage = { role: "user", content: userContent };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const ws = new WebSocket(`${WS_BASE}/${activeSession.session_id}`);
    console.log(ws);
    wsRef.current = ws;
    ws.onopen = () => {
      console.log("WebSocket connected, sending message:", userContent, provider);
      ws.send(JSON.stringify({ message: userContent, provider }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "token") {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content + data.content
          };
          return updated;
        });
      } else if (data.type === "done" || data.type === "error") {
        setIsStreaming(false);
        ws.close();
      }
    };

    ws.onerror = () => setIsStreaming(false);
    ws.onclose = () => setIsStreaming(false);
  };

  const cancelGeneration = () => {
    if (wsRef.current && isStreaming) {
      wsRef.current.close();
      setIsStreaming(false);
      
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx].content += " 🛑 *[Stopped by user]*";
        return updated;
      });
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 antialiased overflow-hidden">
      
      {/* 1. SIDEBAR */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
        <div className="p-4 flex flex-col h-full">
          {/* App Branding */}
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              AI
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-wide text-white">Inference Engine</h1>
              <p className="text-xs text-slate-400">Observability Suite</p>
            </div>
          </div>

          {/* New Chat Button */}
          <button 
            onClick={createNewSession}
            className="w-full mt-2 mb-4 py-2.5 px-4 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl text-sm font-medium text-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Conversation
          </button>

          {/* Session History */}
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

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 text-xs text-slate-500 flex items-center justify-between">
          <span>System Status</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span> Ready
          </span>
        </div>
      </aside>

      {/* 2. MAIN CHAT CONTAINER */}
      <main className="flex-1 flex flex-col bg-slate-950 relative">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-300">
              {activeSession ? (activeSession.title || "Active Chat") : "Select or create a conversation"}
            </span>
          </div>

          {/* Model Selector Pill */}
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

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 lg:px-24 space-y-6">
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                💬
              </div>
              <p className="text-sm font-medium">Select a past session or start a new conversation to begin streaming.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold text-lg">
                ✨
              </div>
              <h2 className="text-base font-semibold text-slate-300">How can I help you today?</h2>
              <p className="text-xs text-slate-500 max-w-sm">Ask a question, analyze data, or generate code with low latency.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex gap-4 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                    isUser 
                      ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                      : 'bg-indigo-600 text-white shadow-indigo-500/20'
                  }`}>
                    {isUser ? 'YOU' : 'AI'}
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                    isUser 
                      ? 'bg-indigo-600 text-white rounded-tr-xs shadow-md' 
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-xs shadow-sm'
                  }`}>
                    {msg.content}
                    {/* Blinking Streaming Cursor for Assistant */}
                    {!isUser && isStreaming && i === messages.length - 1 && (
                      <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse rounded-xs align-middle" />
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Floating Input Area */}
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

      </main>
    </div>
  );
}