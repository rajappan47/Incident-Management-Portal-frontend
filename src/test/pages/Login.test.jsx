import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App, message } from 'antd';
import { MemoryRouter } from 'react-router-dom';

// 🆕 CHANGED — '../pages/Login' → '../../pages/Login'
import Login from '../../pages/Login';
// 🆕 CHANGED — '../hooks/useAuth' → '../../hooks/useAuth'
import { useAuth } from '../../hooks/useAuth';

// Mock dependencies
// 🆕 CHANGED — path must match the import above exactly
vi.mock('../../hooks/useAuth');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper component to wrap Login with required Context Providers
const renderComponent = () => {
  return render(
    <MemoryRouter>
      <App>
        <Login />
      </App>
    </MemoryRouter>
  );
};

describe('Login Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(message, 'success');
    vi.spyOn(message, 'error');

    useAuth.mockReturnValue({
      login: mockLogin,
    });
  });

  test('renders login form with all elements correctly', () => {
    renderComponent();

    expect(screen.getByText('Incident Portal Login')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
  });

  test('shows validation errors when submitting empty form', async () => {
    renderComponent();

    const submitBtn = screen.getByRole('button', { name: /log in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
      expect(screen.getByText('Enter your password')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('shows validation error for invalid email format', async () => {
    renderComponent();

    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitBtn = screen.getByRole('button', { name: /log in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('calls login and navigates to /dashboard on successful submit', async () => {
    mockLogin.mockResolvedValueOnce();

    renderComponent();

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitBtn = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(message.success).toHaveBeenCalledWith('Login successful!');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  test('displays backend error message on 401 status failure', async () => {
    const apiError = {
      response: {
        status: 401,
        data: { message: 'Invalid credentials provided' },
      },
    };
    mockLogin.mockRejectedValueOnce(apiError);

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpass' } });

    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Invalid credentials provided');
    });
  });

  test('displays fallback error message when server responds with 401/400 without message', async () => {
    const apiError = {
      response: {
        status: 400,
        data: {},
      },
    };
    mockLogin.mockRejectedValueOnce(apiError);

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Invalid email or password. Please try again.');
    });
  });

  test('displays connection error message on network failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Network Error'));

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith(
        'Login failed. Please check your connection and try again.'
      );
    });
  });
});