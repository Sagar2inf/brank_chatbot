import { API_BASE, getHeaders } from './api';

export const loginUser = async (username, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json(); 
};

export const signupUser = async (username, password) => {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (res.status === 409 || res.status === 400) {
    throw new Error("Username already exists");
  }
  if (!res.ok) throw new Error("Signup failed");
  
  return res.json();
};