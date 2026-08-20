import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';

import Incidents from '../../pages/IncidentsPage';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

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

// Mock Auth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock Layout component
vi.mock('../../components/common/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

// Mock PriorityBadge module
vi.mock('../../components/common/PriorityBadge', () => ({
  PriorityBadge: ({ priority }) => <span data-testid="priority-badge">{priority}</span>,
}));

const mockCurrentUserId = 'user_admin_123';

const mockIncidentsList = [
  {
    _id: 'inc_1',
    title: 'Database connection leak',
    category: { name: 'Software' },
    priority: 'Critical',
    status: 'In Progress',
    assignedTo: { _id: 'user_admin_123', name: 'Admin User' },
    dueBy: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    _id: 'inc_2',
    title: 'Printer paper jam',
    category: 'Hardware',
    priority: 'Low',
    status: 'Closed',
    assignedTo: { _id: 'agent_456', name: 'Bob Support' },
    dueBy: '2026-08-15T00:00:00.000Z',
    createdAt: '2026-08-02T10:00:00.000Z',
  },
  {
    _id: 'inc_3',
    title: 'VPN disconnects frequently',
    category: { name: 'Network' },
    priority: 'High',
    status: 'New',
    assignedTo: null,
    dueBy: '2026-08-10T00:00:00.000Z',
    createdAt: '2026-08-03T10:00:00.000Z',
  },
];

const mockAgents = [
  { _id: 'agent_456', id: 'agent_456', name: 'Bob Support', role: 'Support Agent' },
  { _id: 'agent_789', id: 'agent_789', name: 'Charlie Tech', role: 'Support Agent' },
];

const renderComponent = () => {
  return render(
    <MemoryRouter>
      <App>
        <Incidents />
      </App>
    </MemoryRouter>
  );
};

describe('Incidents Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuth.mockReturnValue({
      user: { id: mockCurrentUserId, _id: mockCurrentUserId, role: 'Admin' },
    });

    api.get.mockImplementation((url) => {
      if (url.includes('/incidents?all=true') || url === '/incidents') {
        return Promise.resolve({ data: { incidents: mockIncidentsList } });
      }
      if (url === '/users/agents' || url === '/users') {
        return Promise.resolve({ data: mockAgents });
      }
      return Promise.reject(new Error('Endpoint not mocked'));
    });
  });

  test('fetches and displays incidents sorted by priority', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Database connection leak')).toBeInTheDocument();
      expect(screen.getByText('VPN disconnects frequently')).toBeInTheDocument();
      expect(screen.getByText('Printer paper jam')).toBeInTheDocument();
    });

    const titles = screen.getAllByText(/Database|VPN|Printer/).map((el) => el.textContent);
    expect(titles).toEqual([
      'Database connection leak',
      'VPN disconnects frequently',
      'Printer paper jam',
    ]);
  });

  test('filters incidents by tab selection correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('All Tickets (3)')).toBeInTheDocument();
    });

    const activeTab = screen.getByText(/My Active Tickets/i);
    fireEvent.click(activeTab);

    // 🆕 CHANGED — antd Tabs keeps inactive pane content in the DOM by default,
    // so "Database connection leak" can legitimately appear in both the "All" and
    // "Active" panes at once. Use getAllByText instead of getByText.
    await waitFor(() => {
      expect(screen.getAllByText('Database connection leak').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Printer paper jam')).not.toBeInTheDocument();
    });

    const closedTab = screen.getByText(/Closed \/ Resolved/i);
    fireEvent.click(closedTab);

    await waitFor(() => {
      expect(screen.getByText('Printer paper jam')).toBeInTheDocument();
    });
  });

  test('filters list based on search text input and resets filters', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Database connection leak')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by title...');
    fireEvent.change(searchInput, { target: { value: 'Printer' } });

    await waitFor(() => {
      expect(screen.getByText('Printer paper jam')).toBeInTheDocument();
      expect(screen.queryByText('Database connection leak')).not.toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText('Database connection leak')).toBeInTheDocument();
      expect(screen.getByText('Printer paper jam')).toBeInTheDocument();
    });
  });

  test('allows Admin to update incident status inline', async () => {
    api.patch.mockResolvedValueOnce({ data: { message: 'Status updated' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Database connection leak')).toBeInTheDocument();
    });

    // 🆕 CHANGED — scope to the specific table row instead of guessing dropdown
    // position on the whole page (the filter bar above the table also has
    // Select dropdowns, which was causing the wrong one to be clicked).
    const titleCell = screen.getByText('Database connection leak');
    const row = titleCell.closest('tr');
    const rowComboboxes = within(row).getAllByRole('combobox');

    // First combobox within the row is the Status select
    fireEvent.mouseDown(rowComboboxes[0]);

    const resolvedOptions = await screen.findAllByText('Resolved');
    fireEvent.click(resolvedOptions[resolvedOptions.length - 1]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/incidents/inc_1/status', {
        status: 'Resolved',
      });
    });
  });

  test('allows Admin to assign an agent to an incident', async () => {
    api.patch.mockResolvedValueOnce({ data: { message: 'Agent assigned' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Database connection leak')).toBeInTheDocument();
    });

    // 🆕 CHANGED — antd Select renders its placeholder as visible text
    // (a span with class ant-select-selection-placeholder), NOT as a native
    // HTML `placeholder` attribute — so getByPlaceholderText cannot find it.
    // Scope to the row and pick the second combobox (Assigned To column).
    const titleCell = screen.getByText('Database connection leak');
    const row = titleCell.closest('tr');
    const rowComboboxes = within(row).getAllByRole('combobox');

    // Second combobox within the row is the Assign Agent select
    fireEvent.mouseDown(rowComboboxes[1]);

    const charlieOptions = await screen.findAllByText('Charlie Tech');
    fireEvent.click(charlieOptions[charlieOptions.length - 1]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/incidents/inc_1/assign', {
        agentId: 'agent_789',
      });
    });
  });

  test('triggers CSV export download successfully', async () => {
    const mockBlob = new Blob(['title,status\ntest,open'], { type: 'text/csv' });
    api.get.mockImplementation((url) => {
      if (url.includes('/incidents/export/csv')) {
        return Promise.resolve({
          data: mockBlob,
          headers: { 'content-disposition': 'attachment; filename="incidents.csv"' },
        });
      }
      return Promise.resolve({ data: { incidents: mockIncidentsList } });
    });

    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-csv');
    window.URL.revokeObjectURL = vi.fn();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Database connection leak')).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/incidents/export/csv', expect.any(Object));
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  test('displays connection alert and retries when API fetch fails', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/incidents')) {
        return Promise.reject({
          response: { data: { message: 'Server Unreachable' } },
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Connection Notice')).toBeInTheDocument();
      expect(screen.getByText('Server Unreachable')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    expect(api.get).toHaveBeenCalled();
  });
});