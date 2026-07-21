import { createContext, useState, useEffect } from 'react';
import { loginUser, signupUser } from '../services/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await loginUser(username, password);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.token) localStorage.setItem('token', data.token);
  };

  const signup = async (username, password) => {
    const data = await signupUser(username, password);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.token) localStorage.setItem('token', data.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};