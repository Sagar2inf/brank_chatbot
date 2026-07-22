import { useState, useEffect, useRef } from 'react';
import { fetchSessions, fetchSessionHistory, createSession } from '../services/chat';
import { WS_BASE } from '../services/api';

import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';

export default function Chat() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("groq");
  const [isStreaming, setIsStreaming] = useState(false);
  
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    fetchSessions()
      .then(data => setSessions(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    fetchSessionHistory(activeSession.session_id)
      .then(data => setMessages(data))
      .catch(console.error);
  }, [activeSession]);

  const handleCreateNewSession = async () => {
    try {
      const newSession = await createSession();
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

    const token = localStorage.getItem("token");
    const ws = new WebSocket(`${WS_BASE}/${activeSession.session_id}?token=${encodeURIComponent(token)}`);
    //console.log("websocket info: ", ws)
    wsRef.current = ws;
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ message: userContent, provider }));
    };
    // console.log(ws)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // console.log(data)
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
      } else if (data.type === "done") {
        setIsStreaming(false);
        ws.close();
      } else if(data.type == "error"){
        // console.log("Error: ", data.content)
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: data.content,
          };
          return updated;
        });

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
        updated[lastIdx].content += "*[Stopped by user]*";
        return updated;
      });
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 antialiased overflow-hidden">
      <Sidebar 
        sessions={sessions} 
        activeSession={activeSession} 
        setActiveSession={setActiveSession} 
        createNewSession={handleCreateNewSession} 
      />

      <main className="flex-1 flex flex-col bg-slate-950 relative">
        <ChatHeader 
          activeSession={activeSession} 
          provider={provider} 
          setProvider={setProvider} 
        />
        
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 lg:px-24 space-y-6">
          <MessageList 
            messages={messages} 
            isStreaming={isStreaming} 
            activeSession={activeSession} 
            chatEndRef={chatEndRef} 
          />
        </div>

        <ChatInput 
          input={input} 
          setInput={setInput} 
          sendMessage={sendMessage} 
          cancelGeneration={cancelGeneration} 
          isStreaming={isStreaming} 
          activeSession={activeSession} 
        />
      </main>
    </div>
  );
}
