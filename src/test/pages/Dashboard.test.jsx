import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';

import Dashboard from '../../pages/Dashboard';
import api from '../../services/api';

// Mock API and Router navigation
vi.mock('../../services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock custom hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'John Doe', role: 'Support Agent' },
  }),
}));

// Mock AppLayout wrapper
vi.mock('../../components/common/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

// Mock Recharts ResponsiveContainer to render cleanly in JSDOM
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 800, height: 600 }}>{children}</div>
    ),
  };
});

// Helper wrapper
const renderWithProviders = (ui) => {
  return render(
    <MemoryRouter>
      <App>{ui}</App>
    </MemoryRouter>
  );
};

describe('Dashboard Component', () => {
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day in future

  const mockIncidents = [
    {
      _id: 'inc-1',
      title: 'Database Outage',
      priority: 'Critical',
      status: 'New',
      dueBy: pastDate, // Overdue
      createdAt: '2026-02-01T10:00:00.000Z',
    },
    {
      _id: 'inc-2',
      title: 'Email Delivery Slow',
      priority: 'Low',
      status: 'In Progress',
      dueBy: futureDate,
      createdAt: '2026-02-02T10:00:00.000Z',
    },
    {
      _id: 'inc-3',
      title: 'VPN Connection Failure',
      priority: 'High',
      status: 'New',
      dueBy: futureDate,
      createdAt: '2026-02-03T10:00:00.000Z',
    },
    {
      _id: 'inc-4',
      title: 'Printer Paper Jam',
      priority: 'Medium',
      status: 'Resolved',
      dueBy: pastDate, // Resolved, so shouldn't count as overdue
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-16T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: mockIncidents });
  });

  test('renders user welcome banner and role', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/welcome back, john doe/i)).toBeInTheDocument();
      expect(screen.getByText('Support Agent')).toBeInTheDocument();
    });
  });

  test('fetches incidents and calculates statistics correctly', async () => {
    renderWithProviders(<Dashboard />);

    expect(api.get).toHaveBeenCalledWith('/incidents');

    // 🆕 CHANGED — Total: 4, In Progress: 1, Resolved/Closed: 1, SLA Overdue: 1
    // Multiple stat cards show "1", so instead of getByText('1') (ambiguous),
    // scope the search to each specific stat card using its title text as an anchor.
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument(); // Total Incidents — unique value, safe

      const inProgressCard = screen.getByText('In Progress').closest('.ant-card');
      expect(within(inProgressCard).getByText('1')).toBeInTheDocument();

      const resolvedCard = screen.getByText('Resolved / Closed').closest('.ant-card');
      expect(within(resolvedCard).getByText('1')).toBeInTheDocument();

      const overdueCard = screen.getByText('SLA Overdue').closest('.ant-card');
      expect(within(overdueCard).getByText('1')).toBeInTheDocument();
    });
  });

  test('sorts active incidents by priority correctly (Critical -> High -> Low)', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Database Outage')).toBeInTheDocument();
    });

    const activeRows = screen.getAllByRole('row');
    // Row 0 is header. First data row should be Critical ('Database Outage'), second High ('VPN Connection Failure')
    expect(activeRows[1]).toHaveTextContent('Database Outage');
    expect(activeRows[2]).toHaveTextContent('VPN Connection Failure');
    expect(activeRows[3]).toHaveTextContent('Email Delivery Slow');
  });

  test('switches between Active Queue and Closed Queue tabs', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Active Queue (3)')).toBeInTheDocument();
    });

    // Verify resolved ticket is not in active tab
    expect(screen.queryByText('Printer Paper Jam')).not.toBeInTheDocument();

    // Click on Closed / Resolved Tab
    const closedTab = screen.getByText('Closed / Resolved (1)');
    fireEvent.click(closedTab);

    // Verify resolved ticket appears
    await waitFor(() => {
      expect(screen.getByText('Printer Paper Jam')).toBeInTheDocument();
    });
  });

  test('navigates to "Raise New Incident" page on button click', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Raise New Incident')).toBeInTheDocument();
    });

    const raiseBtn = screen.getByRole('button', { name: /raise new incident/i });
    fireEvent.click(raiseBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/incidents/new');
  });

  test('navigates to ticket details page on View action click', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Database Outage')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/incidents/inc-1');
  });

  test('handles API error response gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load dashboard data:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});