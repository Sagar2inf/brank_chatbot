import { API_BASE, getHeaders } from './api';

export const fetchSessions = async () => {
  const res = await fetch(`${API_BASE}/chat/sessions`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
};

export const fetchSessionHistory = async (sessionId) => {
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
};

export const createSession = async () => {
  console.log("Creating a new chat session...");
  const res = await fetch(`${API_BASE}/chat/sessions`, { 
    method: "POST", 
    headers: getHeaders() 
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
};