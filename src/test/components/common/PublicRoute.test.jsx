import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PublicRoute from '../../../components/common/PublicRoute';
import { useAuth } from '../../../hooks/useAuth';

vi.mock('../../../hooks/useAuth');

describe('PublicRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner when loading is true', () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <div>Login Page Content</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('redirects authenticated user to /dashboard', () => {
    useAuth.mockReturnValue({
      user: { name: 'John Doe', role: 'User' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <div>Login Page Content</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders children when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <div>Login Page Content</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Content')).toBeInTheDocument();
  });
});