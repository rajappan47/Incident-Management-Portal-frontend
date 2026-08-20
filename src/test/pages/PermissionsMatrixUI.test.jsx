import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App, message } from 'antd';

import PermissionsMatrixUI from '../components/PermissionsMatrixUI';
import api from '../services/api';

// Mock API service module
vi.mock('../services/api');

const mockSubUsers = [
  {
    _id: 'sub_1',
    name: 'Alice Cooper',
    email: 'alice@example.com',
    permissions: ['tickets:create', 'tickets:reply'],
  },
  {
    _id: 'sub_2',
    name: 'Bob Marley',
    email: 'bob@example.com',
    permissions: [],
  },
];

const renderComponent = (props = {}) => {
  return render(
    <App>
      <PermissionsMatrixUI {...props} />
    </App>
  );
};

describe('PermissionsMatrixUI Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(message, 'error');
    vi.spyOn(message, 'success');

    // Default mock response for sub-users
    api.get.mockResolvedValue({ data: mockSubUsers });
  });

  test('fetches and displays sub-users on initial load', async () => {
    renderComponent();

    expect(api.get).toHaveBeenCalledWith('/users/sub-users');

    await waitFor(() => {
      expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Marley')).toBeInTheDocument();
      expect(screen.getByText('NO ACCESS GRANTED')).toBeInTheDocument();
    });
  });

  test('handles API error when sub-users fetch fails', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));

    renderComponent();

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to load sub-users');
    });
  });

  test('opens matrix modal with correct permissions for END_USER role', async () => {
    renderComponent({ currentUserRole: 'END_USER' });

    await waitFor(() => {
      expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
    });

    const configureButtons = screen.getAllByRole('button', { name: /configure access matrix/i });
    fireEvent.click(configureButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Permission Grants Matrix — \[ Alice Cooper \]/i)).toBeInTheDocument();
      expect(screen.getByText('Create New Tickets')).toBeInTheDocument();
      expect(screen.getByText('Reply to Tickets')).toBeInTheDocument();
      expect(screen.getByText('GRANT tickets:create')).toBeInTheDocument();
    });
  });

  test('loads SUPPORT_AGENT permission catalog when prop changes', async () => {
    renderComponent({ currentUserRole: 'SUPPORT_AGENT' });

    await waitFor(() => {
      expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
    });

    const configureButtons = screen.getAllByRole('button', { name: /configure access matrix/i });
    fireEvent.click(configureButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('View Active Tickets')).toBeInTheDocument();
      expect(screen.getByText('Assign / Reassign Tickets')).toBeInTheDocument();
      expect(screen.getByText('GRANT tickets:view_active')).toBeInTheDocument();
    });
  });

  test('toggles permission switches and sends patched data to backend on save', async () => {
    api.patch.mockResolvedValueOnce({ data: { success: true } });

    renderComponent({ currentUserRole: 'END_USER' });

    await waitFor(() => {
      expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
    });

    // Open configure modal for Alice
    const configureButtons = screen.getAllByRole('button', { name: /configure access matrix/i });
    fireEvent.click(configureButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Permission Grants Matrix — [ Alice Cooper ]')).toBeInTheDocument();
    });

    // Find switches in the table modal
    const switches = screen.getAllByRole('switch');
    // Toggle one of the permission switches
    fireEvent.click(switches[1]); // Toggle View Company Tickets ('tickets:view_org')

    // Click Apply & Save Grants
    const saveButton = screen.getByRole('button', { name: /apply & save grants/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/sub-users/sub_1/permissions', {
        permissions: expect.arrayContaining(['tickets:create', 'tickets:reply', 'tickets:view_org']),
      });
      expect(message.success).toHaveBeenCalledWith('Permissions updated for Alice Cooper');
    });
  });

  test('displays error message when saving grants fails', async () => {
    api.patch.mockRejectedValueOnce(new Error('Update failed'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
    });

    const configureButtons = screen.getAllByRole('button', { name: /configure access matrix/i });
    fireEvent.click(configureButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Permission Grants Matrix — [ Alice Cooper ]')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /apply & save grants/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to update grants');
    });
  });
});