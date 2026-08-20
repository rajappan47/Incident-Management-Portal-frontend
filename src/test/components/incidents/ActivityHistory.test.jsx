import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import ActivityHistory from '../../../components/incidents/ActivityHistory';

describe('ActivityHistory Component', () => {
  const mockActivities = [
    {
      _id: 'act-1',
      action: 'Status Updated',
      performedBy: { name: 'Alice' },
      oldValue: 'OPEN',
      newValue: 'IN_PROGRESS',
      timestamp: '2026-08-10T10:00:00.000Z',
    },
    {
      _id: 'act-2',
      action: 'Priority Changed',
      performedBy: { name: 'Bob' },
      oldValue: 'Medium',
      newValue: 'High',
      createdAt: '2026-08-11T12:30:00.000Z',
    },
  ];

  it('renders correctly with given activities data', () => {
    render(<ActivityHistory activities={mockActivities} />);

    expect(screen.getByText('Status Updated')).toBeInTheDocument();
    expect(screen.getByText('Priority Changed')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders formatted timestamp correctly using timestamp or createdAt', () => {
    render(<ActivityHistory activities={mockActivities} />);

    const expectedDate1 = new Date('2026-08-10T10:00:00.000Z').toLocaleString();
    const expectedDate2 = new Date('2026-08-11T12:30:00.000Z').toLocaleString();

    expect(screen.getByText(expectedDate1)).toBeInTheDocument();
    expect(screen.getByText(expectedDate2)).toBeInTheDocument();
  });

  it('falls back to "System" when performedBy or performedBy.name is missing', () => {
    const activitiesWithoutUser = [
      {
        _id: 'act-3',
        action: 'System Auto Close',
        performedBy: null,
        timestamp: '2026-08-12T08:00:00.000Z',
      },
    ];

    render(<ActivityHistory activities={activitiesWithoutUser} />);

    expect(screen.getByText('System Auto Close')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('does not render old/new value tags when both are missing', () => {
    const activityWithoutChanges = [
      {
        _id: 'act-4',
        action: 'Comment Added',
        performedBy: { name: 'Charlie' },
        timestamp: '2026-08-12T09:00:00.000Z',
      },
    ];

    render(<ActivityHistory activities={activityWithoutChanges} />);

    expect(screen.getByText('Comment Added')).toBeInTheDocument();
    expect(screen.queryByText(/Changed from/i)).not.toBeInTheDocument();
  });

  it('handles empty activities array without throwing error', () => {
    const { container } = render(<ActivityHistory activities={[]} />);

    expect(container.querySelector('.ant-timeline')).toBeInTheDocument();
    expect(screen.queryByText(/by/i)).not.toBeInTheDocument();
  });

  it('handles undefined activities prop gracefully', () => {
    const { container } = render(<ActivityHistory activities={undefined} />);

    expect(container.querySelector('.ant-timeline')).toBeInTheDocument();
    expect(screen.queryByText(/by/i)).not.toBeInTheDocument();
  });
});