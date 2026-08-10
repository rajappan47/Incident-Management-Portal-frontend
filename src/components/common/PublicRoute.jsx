// src/components/PublicRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spin } from 'antd';

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '20% auto' }} />;
  }

  // If user is already logged in, send them to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // If not logged in, allow viewing Register/Login page
  return children;
};

export default PublicRoute;