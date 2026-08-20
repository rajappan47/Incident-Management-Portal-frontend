import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IncidentTable from '../../../components/incidents/IncidentTable';

// Mock react-router-dom navigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock child components to isolate IncidentTable behavior
vi.mock('../../../components/common/PriorityBadge', () => ({
  PriorityBadge: ({ priority }) => (
    <span data-testid="priority-badge">{priority || 'Low'}</span>
  ),
}));

vi.mock('../../../components/common/SLABadge', () => ({
  SLABadge: ({ isOverdue }) => (
    <span data-testid="sla-badge">{isOverdue ? 'Overdue' : 'On Time'}</span>
  ),
}));

describe('IncidentTable Component', () => {
  const mockIncidents = [
    {
      _id: 'inc-1',
      title: 'Database connection failed',
      category: { name: 'Database' },
      priority: 'High',
      status: 'In Progress',
      assignedTo: { name: 'John Doe' },
      isOverdue: true,
    },
    {
      _id: 'inc-2',
      title: 'VPN login error',
      category: null,
      priority: 'Low',
      status: 'New',
      assignedTo: null,
      isOverdue: false,
    },
    {
      _id: 'inc-3',
      title: 'Email server down',
      category: { name: 'Network' },
      priority: 'Critical',
      status: 'Resolved',
      assignedTo: { name: 'Jane Smith' },
      isOverdue: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <IncidentTable incidents={mockIncidents} loading={false} {...props} />
    );
  };

  it('renders table column headers correctly', () => {
    renderComponent();

    expect(screen.getByText('Ticket Title')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Assigned To')).toBeInTheDocument();
    expect(screen.getByText('SLA Status')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('renders list of incident rows correctly', () => {
    renderComponent();

    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.getByText('VPN login error')).toBeInTheDocument();
    expect(screen.getByText('Email server down')).toBeInTheDocument();
  });

  it('renders category and handles missing/null category gracefully', () => {
    renderComponent();

    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders assigned agent and displays "Unassigned" when null', () => {
    renderComponent();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('renders priority and SLA badges correctly per row', () => {
    renderComponent();

    const priorityBadges = screen.getAllByTestId('priority-badge');
    expect(priorityBadges).toHaveLength(3);
    expect(priorityBadges[0]).toHaveTextContent('High');
    expect(priorityBadges[1]).toHaveTextContent('Low');

    const slaBadges = screen.getAllByTestId('sla-badge');
    expect(slaBadges).toHaveLength(3);
    expect(slaBadges[0]).toHaveTextContent('Overdue');
    expect(slaBadges[1]).toHaveTextContent('On Time');
  });

  it('renders status tags with correct labels', () => {
    renderComponent();

    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('navigates to incident details page when View button is clicked', () => {
    renderComponent();

    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    expect(viewButtons).toHaveLength(3);

    fireEvent.click(viewButtons[0]);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/incidents/inc-1');
  });

  it('shows loading spinner/state when loading prop is true', () => {
    const { container } = renderComponent({ incidents: [], loading: true });

    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders empty table message when no incidents are provided', () => {
    renderComponent({ incidents: [], loading: false });

    // Filter using the class selector to avoid SVG <title> collision
    expect(
      screen.getByText('No data', { selector: '.ant-empty-description' })
    ).toBeInTheDocument();
  });
});