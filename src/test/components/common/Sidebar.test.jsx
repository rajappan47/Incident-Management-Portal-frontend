import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import Sidebar from '../../../components/common/Sidebar';
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

describe('Sidebar Component', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useLocation.mockReturnValue({ pathname: '/' });
  });

  it('renders standard menu items for regular User role', () => {
    useAuth.mockReturnValue({
      user: { name: 'John Doe', role: 'User' },
    });

    render(<Sidebar />);

    expect(screen.getByText('Incident Portal')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Incidents')).toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('navigates to selected route when a menu item is clicked', () => {
    useAuth.mockReturnValue({
      user: { name: 'John Doe', role: 'User' },
    });

    render(<Sidebar />);

    const incidentsOption = screen.getByText('Incidents');
    fireEvent.click(incidentsOption);

    expect(mockNavigate).toHaveBeenCalledWith('/incidents');
  });
});