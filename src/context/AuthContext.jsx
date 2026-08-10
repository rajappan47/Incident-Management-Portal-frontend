import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    // Store token
    localStorage.setItem('token', data.token);
    
    // If backend returns user directly in login response:
    if (data.user) {
      setUser(data.user);
    } else {
      // Otherwise fetch user profile with new token
      await fetchCurrentUser();
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {/* ✅ ALWAYS render children so React Router can load /register smoothly */}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);