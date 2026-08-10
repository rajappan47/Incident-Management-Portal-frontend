import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { IncidentProvider } from './context/IncidentContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

// Import Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetail from './pages/IncidentDetail';
import CreateIncident from './pages/CreateIncident';
import AdminUsers from './pages/AdminUsers';
import AdminCategories from './pages/AdminCategories';


// Public Route Guard (Prevents logged-in users from viewing Login/Register)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '20% auto' }} />;
  }

  // If already logged in, send to dashboard instead of login/register
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => (
  <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
    <AntdApp>
      <AuthProvider>
        <IncidentProvider>
          <Router>
            <Routes>
              {/* Home Route */}
              <Route path="/" element={<Home />} />

              {/* Public Routes Wrapped with PublicRoute */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />

              {/* Protected Dashboard Route */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Support Agent', 'End User']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Other Protected Incident Routes */}
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Support Agent', 'End User']}>
                    <IncidentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents/new"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Support Agent', 'End User']}>
                    <CreateIncident />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents/:id"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Support Agent', 'End User']}>
                    <IncidentDetail />
                  </ProtectedRoute>
                }
              />

              {/* Admin Only Routes */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminCategories />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </Router>
        </IncidentProvider>
      </AuthProvider>
    </AntdApp>
  </ConfigProvider>
);

export default App;