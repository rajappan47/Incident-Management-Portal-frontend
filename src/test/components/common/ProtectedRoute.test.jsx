import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import { useAuth } from '../../../hooks/useAuth';

vi.mock('../../../hooks/useAuth');

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (ui, { initialEntries = ['/protected'] } = {}) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/protected" element={ui} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading spinner when loading is true', () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    const { container } = renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to / when user role is not in allowedRoles', () => {
    useAuth.mockReturnValue({
      user: { name: 'Regular User', role: 'User' },
      loading: false,
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders children when user role matches allowedRoles', () => {
    useAuth.mockReturnValue({
      user: { name: 'Admin User', role: 'Admin' },
      loading: false,
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});