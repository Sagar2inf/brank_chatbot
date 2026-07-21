export const API_BASE = "http://localhost:8000/api";
export const WS_BASE = "ws://localhost:8000/api/chat/stream";

export const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};