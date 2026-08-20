import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from 'antd';
import CommentSection from '../../../components/incidents/CommentSection';
import api from '../../../services/api';

// Mock API service module
vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock Ant Design App.useApp message instance
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => ({
        message: {
          success: mockMessageSuccess,
          error: mockMessageError,
        },
      }),
    },
  };
});

describe('CommentSection Component', () => {
  const incidentId = 'inc-123';
  const mockOnCommentAdded = vi.fn();

  const mockComments = [
    {
      _id: 'c1',
      authorId: { name: 'Alice Agent' },
      message: 'Investigating the issue.',
      isInternal: false,
      createdAt: '2026-08-10T10:00:00.000Z',
    },
    {
      _id: 'c2',
      postedBy: { name: 'Bob Admin' },
      message: 'Internal notes regarding server restart.',
      isInternal: true,
      createdAt: '2026-08-10T11:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <App>
        <CommentSection
          incidentId={incidentId}
          comments={mockComments}
          onCommentAdded={mockOnCommentAdded}
          userRole="End User"
          {...props}
        />
      </App>
    );
  };

  it('renders comment list header and author names correctly', () => {
    renderComponent();

    expect(screen.getByText('2 Comments')).toBeInTheDocument();
    expect(screen.getByText('Alice Agent')).toBeInTheDocument();
    expect(screen.getByText('Investigating the issue.')).toBeInTheDocument();

    expect(screen.getByText('Bob Admin')).toBeInTheDocument();
    expect(screen.getByText('Internal notes regarding server restart.')).toBeInTheDocument();
  });

  it('renders "Internal Note" tag for internal comments', () => {
    renderComponent();

    expect(screen.getByText('Internal Note')).toBeInTheDocument();
  });

  it('hides internal note checkbox for non-staff roles (e.g. End User)', () => {
    renderComponent({ userRole: 'End User' });

    expect(
      screen.queryByText(/Mark as Internal Note/i)
    ).not.toBeInTheDocument();
  });

  it('shows internal note checkbox for staff roles (Admin / Support Agent)', () => {
    renderComponent({ userRole: 'Admin' });

    expect(
      screen.getByText(/Mark as Internal Note/i)
    ).toBeInTheDocument();
  });

  it('submits a public comment successfully', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    renderComponent({ userRole: 'End User' });

    const input = screen.getByPlaceholderText(/Write a response or note.../i);
    const submitButton = screen.getByRole('button', { name: /Post Comment/i });

    fireEvent.change(input, { target: { value: 'This is a new public comment' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        `/incidents/${incidentId}/comments`,
        {
          message: 'This is a new public comment',
          isInternal: false,
        }
      );
    });

    expect(mockMessageSuccess).toHaveBeenCalledWith('Comment added successfully');
    expect(mockOnCommentAdded).toHaveBeenCalledTimes(1);
  });

  it('submits an internal comment when staff checks internal note option', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    renderComponent({ userRole: 'Support Agent' });

    const input = screen.getByPlaceholderText(/Write a response or note.../i);
    const checkbox = screen.getByRole('checkbox', { name: /Mark as Internal Note/i });
    const submitButton = screen.getByRole('button', { name: /Post Comment/i });

    fireEvent.change(input, { target: { value: 'Staff private note' } });
    fireEvent.click(checkbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        `/incidents/${incidentId}/comments`,
        {
          message: 'Staff private note',
          isInternal: true,
        }
      );
    });

    expect(mockMessageSuccess).toHaveBeenCalledWith('Comment added successfully');
    expect(mockOnCommentAdded).toHaveBeenCalledTimes(1);
  });

  it('handles submission failure and displays backend error message', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Failed to save comment in database' } },
    });

    renderComponent({ userRole: 'End User' });

    const input = screen.getByPlaceholderText(/Write a response or note.../i);
    const submitButton = screen.getByRole('button', { name: /Post Comment/i });

    fireEvent.change(input, { target: { value: 'Failing comment' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMessageError).toHaveBeenCalledWith('Failed to save comment in database');
    });

    expect(mockOnCommentAdded).not.toHaveBeenCalled();
  });

  it('renders correctly with empty or undefined comments array', () => {
    renderComponent({ comments: null });

    expect(screen.getByText('0 Comments')).toBeInTheDocument();
  });
});