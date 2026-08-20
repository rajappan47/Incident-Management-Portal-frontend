import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';

import Home from '../../pages/Home';
import { useAuth } from '../../hooks/useAuth';

// Mock Router navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Auth hook
// 🆕 CHANGED — '../hooks/useAuth' → '../../hooks/useAuth' (must match the import path above exactly)
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Helper wrapper for Ant Design & React Router contexts
const renderWithProviders = (ui) => {
  return render(
    <MemoryRouter>
      <App>{ui}</App>
    </MemoryRouter>
  );
};

describe('Home Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated User Flow', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: null });
    });

    test('renders brand header and authentication action buttons', () => {
      renderWithProviders(<Home />);

      expect(screen.getByText('IncidentPortal')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    test('renders hero title and unauthenticated primary CTAs', () => {
      renderWithProviders(<Home />);

      expect(
        screen.getByText(/resolve operational incidents faster & smarter/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /get started now/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create free account/i })
      ).toBeInTheDocument();
    });

    test('navigates to /login when clicking "Log In" button', () => {
      renderWithProviders(<Home />);

      const loginBtn = screen.getByRole('button', { name: /log in/i });
      fireEvent.click(loginBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('navigates to /register when clicking "Register" or "Create Free Account" button', () => {
      renderWithProviders(<Home />);

      const registerBtn = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/register');

      const createAccountBtn = screen.getByRole('button', { name: /create free account/i });
      fireEvent.click(createAccountBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/register');
    });

    test('navigates to /login when clicking "Get Started Now" while unauthenticated', () => {
      renderWithProviders(<Home />);

      const getStartedBtn = screen.getByRole('button', { name: /get started now/i });
      fireEvent.click(getStartedBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Authenticated User Flow', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { name: 'Jane Doe', email: 'jane@example.com' },
      });
    });

    test('renders "Go to Dashboard" and hides login/register actions', () => {
      renderWithProviders(<Home />);

      // Should render "Go to Dashboard" in both header and hero
      const dashboardBtns = screen.getAllByRole('button', { name: /go to dashboard/i });
      expect(dashboardBtns.length).toBeGreaterThanOrEqual(1);

      expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /create free account/i })).not.toBeInTheDocument();
    });

    test('navigates to /dashboard when "Go to Dashboard" button is clicked', () => {
      renderWithProviders(<Home />);

      const dashboardBtns = screen.getAllByRole('button', { name: /go to dashboard/i });
      fireEvent.click(dashboardBtns[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('General Features & Layout', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: null });
    });

    test('navigates to home root "/" when clicking top logo/brand area', () => {
      renderWithProviders(<Home />);

      const brandLogo = screen.getByText('IncidentPortal');
      fireEvent.click(brandLogo);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    test('renders feature highlights section cards correctly', () => {
      renderWithProviders(<Home />);

      expect(screen.getByText('Role-Based Access')).toBeInTheDocument();
      expect(screen.getByText('SLA Tracking')).toBeInTheDocument();
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
      expect(screen.getByText('Live Analytics')).toBeInTheDocument();
    });

    test('renders footer copyright text with current year', () => {
      renderWithProviders(<Home />);

      const currentYear = new Date().getFullYear().toString();
      expect(screen.getByText(new RegExp(`Incident Management Portal ©${currentYear}`, 'i'))).toBeInTheDocument();
    });
  });
});