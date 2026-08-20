import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App } from 'antd';

import AdminUsers from '../../pages/AdminUsers';
import api from '../../services/api';

vi.mock('../../services/api');

const renderWithAntdApp = (ui) => {
  return render(<App>{ui}</App>);
};

describe('AdminUsers Component', () => {
  const mockUsers = [
    {
      _id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'End User',
    },
    {
      _id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'Support Agent',
    },
    {
      _id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'Admin',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: mockUsers } });
  });

  test('fetches and renders user list on mount', async () => {
    renderWithAntdApp(<AdminUsers />);

    expect(api.get).toHaveBeenCalledWith('/users');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });
  });

  test('opens add user modal and submits a new user', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    renderWithAntdApp(<AdminUsers />);

    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    const addButton = screen.getByRole('button', { name: /add user/i });
    fireEvent.click(addButton);

    expect(screen.getByText('Add New User')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Alice Green' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Secret123!' },
    });

    const createButton = screen.getByRole('button', { name: /^create user$/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users', {
        name: 'Alice Green',
        email: 'alice@example.com',
        password: 'Secret123!',
        role: 'End User',
      });
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  test('opens edit modal and updates existing user details', async () => {
    api.put.mockResolvedValueOnce({ data: { success: true } });

    renderWithAntdApp(<AdminUsers />);

    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    // Target the specific row and open its Dropdown
    const row = screen.getByText('John Doe').closest('tr');
    const moreBtn = row.querySelector('.ant-dropdown-trigger');
    
    fireEvent.mouseEnter(moreBtn);
    fireEvent.click(moreBtn);

    const editMenuItem = await screen.findByText('Edit Details');
    fireEvent.click(editMenuItem);

    expect(screen.getByText('Edit User Details')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeDisabled();

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'John Updated' } });

    const updateButton = screen.getByRole('button', { name: /^update details$/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/users/user-1', {
        name: 'John Updated',
        email: 'john@example.com',
      });
    });
  });

  test('deletes a non-admin user via action dropdown and popconfirm', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } });

    renderWithAntdApp(<AdminUsers />);

    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

    const row = screen.getByText('John Doe').closest('tr');
    const moreBtn = row.querySelector('.ant-dropdown-trigger');

    fireEvent.mouseEnter(moreBtn);
    fireEvent.click(moreBtn);

    const deleteMenuItem = await screen.findByText('Delete User');
    fireEvent.click(deleteMenuItem);

    const confirmButton = await screen.findByRole('button', { name: /yes, delete/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/users/user-1');
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  test('does not show delete action for Admin users', async () => {
    renderWithAntdApp(<AdminUsers />);

    await waitFor(() => expect(screen.getByText('Admin User')).toBeInTheDocument());

    const row = screen.getByText('Admin User').closest('tr');
    const moreBtn = row.querySelector('.ant-dropdown-trigger');

    fireEvent.mouseEnter(moreBtn);
    fireEvent.click(moreBtn);

    expect(await screen.findByText('Edit Details')).toBeInTheDocument();
    expect(screen.queryByText('Delete User')).not.toBeInTheDocument();
  });
});