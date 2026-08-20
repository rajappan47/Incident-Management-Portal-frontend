import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App } from 'antd';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import IncidentDetail from '../pages/IncidentDetail';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Mock API and Router navigation
vi.mock('../services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Auth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock custom sub-components
vi.mock('../components/common/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('../components/incidents/CommentSection', () => ({
  default: ({ incidentId, comments }) => (
    <div data-testid="comment-section">
      <span>Comments Count: {comments.length}</span>
      <span>Incident ID: {incidentId}</span>
    </div>
  ),
}));

vi.mock('../components/incidents/ActivityHistory', () => ({
  default: ({ activities }) => (
    <div data-testid="activity-history">
      <span>Activities Count: {activities.length}</span>
    </div>
  ),
}));

const VALID_ID = '65baf4601234567890abcdef';

const mockIncidentData = {
  _id: VALID_ID,
  title: 'Server Latency Spikes',
  description: 'High latency observed across primary database cluster.',
  status: 'In Progress',
  priority: 'High',
  isOverdue: true,
  category: { name: 'Infrastructure' },
  reportedBy: { name: 'Alice Smith', email: 'alice@example.com' },
  assignedTo: { _id: '65baf4601234567890agent1', id: '65baf4601234567890agent1', name: 'Bob Agent', email: 'bob@example.com', team: 'DevOps' },
  dueBy: '2026-02-10T12:00:00.000Z',
  createdAt: '2026-02-01T10:00:00.000Z',
};

const mockComments = [
  { _id: 'c1', text: 'Investigating database logs.' },
];

const mockActivities = [
  { _id: 'a1', action: 'Status changed to In Progress' },
];

const mockAgents = [
  { _id: '65baf4601234567890agent1', name: 'Bob Agent', role: 'Support Agent' },
  { _id: '65baf4601234567890agent2', name: 'Charlie Tech', role: 'Support Agent' },
];

const renderWithProviders = (route = `/incidents/${VALID_ID}`) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/incidents" element={<div>Incidents Page</div>} />
        </Routes>
      </App>
    </MemoryRouter>
  );
};

describe('IncidentDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { role: 'Admin', team: 'DevOps' },
    });

    api.get.mockImplementation((url) => {
      if (url === `/incidents/${VALID_ID}`) {
        return Promise.resolve({ data: mockIncidentData });
      }
      if (url === `/incidents/${VALID_ID}/comments`) {
        return Promise.resolve({ data: mockComments });
      }
      if (url === `/incidents/${VALID_ID}/activities`) {
        return Promise.resolve({ data: mockActivities });
      }
      if (url === '/users/agents' || url === '/users' || url === '/incidents/team-members') {
        return Promise.resolve({ data: mockAgents });
      }
      return Promise.reject(new Error('Not Found'));
    });
  });

  test('handles invalid MongoDB ObjectId format gracefully', async () => {
    renderWithProviders('/incidents/invalid-id-123');

    await waitFor(() => {
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  test('fetches and renders incident details, metadata, and description correctly', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Server Latency Spikes')).toBeInTheDocument();
      expect(screen.getByText('High latency observed across primary database cluster.')).toBeInTheDocument();
      expect(screen.getByText('Infrastructure')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith (alice@example.com)')).toBeInTheDocument();
      expect(screen.getByText('Bob Agent (bob@example.com)')).toBeInTheDocument();
    });
  });

  test('renders 403 Forbidden state when user is not authorized', async () => {
    api.get.mockImplementation((url) => {
      if (url === `/incidents/${VALID_ID}`) {
        return Promise.reject({ response: { status: 403 } });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(
        screen.getByText('Not authorized to view this incident. You can only view tickets assigned to you or your team.')
      ).toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button', { name: /back to my incidents/i });
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/incidents');
  });

  test('updates status when an admin or support agent changes status dropdown', async () => {
    api.patch.mockResolvedValueOnce({ data: { message: 'Updated' } });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Server Latency Spikes')).toBeInTheDocument();
    });

    const statusSelect = screen.getByText('In Progress');
    fireEvent.mouseDown(statusSelect);

    const resolvedOption = await screen.findByText('Resolved');
    fireEvent.click(resolvedOption);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(`/incidents/${VALID_ID}/status`, {
        status: 'Resolved',
      });
    });
  });

  test('allows Admin to assign an agent to the ticket', async () => {
    api.patch.mockResolvedValueOnce({ data: { message: 'Assigned' } });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Server Latency Spikes')).toBeInTheDocument();
    });

    const assignSelect = screen.getByPlaceholderText('Assign Agent');
    fireEvent.mouseDown(assignSelect);

    const charlieOption = await screen.findByText('Charlie Tech');
    fireEvent.click(charlieOption);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(`/incidents/${VALID_ID}/assign`, {
        agentId: '65baf4601234567890agent2',
      });
    });
  });

  test('allows Support Agent to reassign within team', async () => {
    useAuth.mockReturnValue({
      user: { role: 'Support Agent', team: 'DevOps' },
    });
    api.put.mockResolvedValueOnce({ data: { message: 'Reassigned' } });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Server Latency Spikes')).toBeInTheDocument();
    });

    const reassignSelect = screen.getByPlaceholderText('Reassign in Team');
    fireEvent.mouseDown(reassignSelect);

    const charlieOption = await screen.findByText('Charlie Tech');
    fireEvent.click(charlieOption);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(`/incidents/${VALID_ID}/reassign`, {
        targetAgentId: '65baf4601234567890agent2',
      });
    });
  });

  test('renders comments and audit history tabs correctly', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('comment-section')).toBeInTheDocument();
      expect(screen.getByText('Comments Count: 1')).toBeInTheDocument();
    });

    const auditTab = screen.getByText('Audit History (1)');
    fireEvent.click(auditTab);

    await waitFor(() => {
      expect(screen.getByTestId('activity-history')).toBeInTheDocument();
      expect(screen.getByText('Activities Count: 1')).toBeInTheDocument();
    });
  });
});