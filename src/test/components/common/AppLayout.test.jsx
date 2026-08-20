import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import AppLayout from '../../../components/common/AppLayout';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

vi.mock('../../../hooks/useAuth');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('AppLayout Component', () => {
  const mockNavigate = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useLocation.mockReturnValue({ pathname: '/dashboard' });
  });

  it('renders child content and brand header correctly', async () => {
    useAuth.mockReturnValue({
      user: { name: 'John Doe', role: 'User' },
      logout: mockLogout,
    });

    await act(async () => {
      render(
        <AppLayout>
          <div data-testid="test-child">Child Content</div>
        </AppLayout>
      );
    });

    expect(screen.getByText('Incident Portal')).toBeInTheDocument();
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });
});