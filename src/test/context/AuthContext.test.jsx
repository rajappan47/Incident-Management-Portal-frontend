import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Mock the API service module
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Helper component to test Auth Context consumption
const TestComponent = () => {
  const { user, loading, login, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-info">
        {user ? `User: ${user.name}` : 'No User'}
      </div>
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthProvider & useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Initial Loading & Initialization Tests ---

  it('sets loading to false and user to null if no token exists in localStorage', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state check after useEffect runs
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('user-info')).toHaveTextContent('No User');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches current user on mount if token exists in localStorage', async () => {
    localStorage.setItem('token', 'fake-jwt-token');
    api.get.mockResolvedValueOnce({ data: { id: 1, name: 'John Doe' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('User: John Doe');
    });

    expect(api.get).toHaveBeenCalledWith('/auth/me');
  });

  it('clears token and sets user to null if fetchCurrentUser fails on mount', async () => {
    localStorage.setItem('token', 'invalid-jwt-token');
    api.get.mockRejectedValueOnce(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('No User');
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  // --- Login Flow Tests ---

  it('logs in successfully and sets user directly if backend returns user object', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    api.post.mockResolvedValueOnce({
      data: {
        token: 'new-auth-token',
        user: { id: 2, name: 'Alice Smith' },
      },
    });

    const loginButton = screen.getByRole('button', { name: /login/i });

    await act(async () => {
      loginButton.click();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password',
    });
    expect(localStorage.getItem('token')).toBe('new-auth-token');
    expect(screen.getByTestId('user-info')).toHaveTextContent('User: Alice Smith');
  });

  it('logs in and fetches user via /auth/me if backend returns token only', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    api.post.mockResolvedValueOnce({
      data: { token: 'new-auth-token' },
    });
    api.get.mockResolvedValueOnce({ data: { id: 3, name: 'Bob Johnson' } });

    const loginButton = screen.getByRole('button', { name: /login/i });

    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('User: Bob Johnson');
    });

    expect(api.get).toHaveBeenCalledWith('/auth/me');
  });

  // --- Logout Flow Tests ---

  it('removes token and resets user state upon calling logout', async () => {
    localStorage.setItem('token', 'valid-token');
    api.get.mockResolvedValueOnce({ data: { id: 1, name: 'John Doe' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toHaveTextContent('User: John Doe');
    });

    const logoutButton = screen.getByRole('button', { name: /logout/i });

    act(() => {
      logoutButton.click();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('user-info')).toHaveTextContent('No User');
  });
});