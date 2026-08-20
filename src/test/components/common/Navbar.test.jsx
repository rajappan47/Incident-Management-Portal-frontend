import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Navbar from '../../../components/common/Navbar';
import { useAuth } from '../../../hooks/useAuth';

// Mock the useAuth hook
vi.mock('../../../hooks/useAuth');

// Mock Ant Design Dropdown to render menu inline for easy testing
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Dropdown: ({ children, menu }) => (
      <div>
        {children}
        <div data-testid="dropdown-menu">
          {menu?.items?.map((item) => (
            <button key={item.key} onClick={item.onClick}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    ),
  };
});

describe('Navbar Component', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user name and role correctly when user is authenticated', () => {
    useAuth.mockReturnValue({
      user: { name: 'John Doe', role: 'Admin' },
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/(Admin)/i)).toBeInTheDocument();
  });

  it('triggers logout function when logout menu item is clicked', () => {
    useAuth.mockReturnValue({
      user: { name: 'Jane Smith', role: 'User' },
      logout: mockLogout,
    });

    render(<Navbar />);

    // Click the logout button rendered inside mocked dropdown
    const logoutBtn = screen.getByText('Logout');
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});