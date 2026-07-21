export default function MessageList({ messages, isStreaming, activeSession, chatEndRef }) {
  if (!activeSession) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
          💬
        </div>
        <p className="text-sm font-medium">Select a past session or start a new conversation to begin streaming.</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold text-lg">
          ✨
        </div>
        <h2 className="text-base font-semibold text-slate-300">How can I help you today?</h2>
        <p className="text-xs text-slate-500 max-w-sm">Ask a question, analyze data, or generate code with low latency.</p>
      </div>
    );
  }

  return (
    <>
      {messages.map((msg, i) => {
        const isUser = msg.role === 'user';
        return (
          <div key={i} className={`flex gap-4 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
              isUser 
                ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                : 'bg-indigo-600 text-white shadow-indigo-500/20'
            }`}>
              {isUser ? 'YOU' : 'AI'}
            </div>

            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
              isUser 
                ? 'bg-indigo-600 text-white rounded-tr-xs shadow-md' 
                : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-xs shadow-sm'
            }`}>
              {msg.content}
              {!isUser && isStreaming && i === messages.length - 1 && (
                <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse rounded-xs align-middle" />
              )}
            </div>
          </div>
        );
      })}
      <div ref={chatEndRef} />
    </>
  );
}