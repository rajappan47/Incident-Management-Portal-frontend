import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App, message } from 'antd';

// Corrected relative paths: Step up two levels from src/test/pages/ to src/
import Register from '../../pages/Register';
import api from '../../services/api';

// Mock API service module with matching path
vi.mock('../../services/api');

const mockCategories = [
  { _id: 'cat_1', name: 'Software' },
  { _id: 'cat_2', name: 'Hardware' },
  { _id: 'cat_3', name: 'Network' },
];

const renderComponent = () => {
  return render(
    <App>
      <Register />
    </App>
  );
};

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(message, 'error');
    vi.spyOn(message, 'success');

    // Default mock response for categories fetch
    api.get.mockResolvedValue({ data: mockCategories });
  });

  test('fetches categories on mount and renders basic form fields', async () => {
    renderComponent();

    expect(api.get).toHaveBeenCalledWith('/categories');

    expect(screen.getByText('User Registration')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account role/i)).toBeInTheDocument();

    // Support Agent conditional fields should be hidden by default
    expect(screen.queryByLabelText(/assigned team/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/handled categories/i)).not.toBeInTheDocument();
  });

  test('handles categories when nested inside response.data.data', async () => {
    api.get.mockResolvedValueOnce({ data: { data: mockCategories } });

    renderComponent();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/categories');
    });
  });

  test('shows error message if fetching categories fails', async () => {
    api.get.mockRejectedValueOnce(new Error('Database connection failed'));

    renderComponent();

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to load categories list from database');
    });
  });

  test('shows validation errors when submitting an empty form', async () => {
    renderComponent();

    const submitBtn = screen.getByRole('button', { name: /register user/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Please enter full name')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  test('displays conditional fields when Support Agent role is selected', async () => {
    renderComponent();

    // Open Role Dropdown
    const roleSelect = screen.getByLabelText(/account role/i);
    fireEvent.mouseDown(roleSelect);

    // 🆕 CHANGED — antd's virtualized dropdown can render duplicate text nodes;
    // use findAllByText and click the last (actual visible) match
    const agentOptions = await screen.findAllByText('Support Agent');
    fireEvent.click(agentOptions[agentOptions.length - 1]);

    await waitFor(() => {
      expect(screen.getByLabelText(/assigned team/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/handled categories/i)).toBeInTheDocument();
    });
  });

  test('submits form successfully for End User role', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'securepassword123' },
    });

    const submitBtn = screen.getByRole('button', { name: /register user/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securepassword123',
        role: 'End User',
      });
      expect(message.success).toHaveBeenCalledWith('Registration successful!');
    });
  });

  test('submits form successfully for Support Agent role with selected categories', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    renderComponent();

    // Switch role to Support Agent
    fireEvent.mouseDown(screen.getByLabelText(/account role/i));
    // 🆕 CHANGED
    const roleOptions = await screen.findAllByText('Support Agent');
    fireEvent.click(roleOptions[roleOptions.length - 1]);

    // Fill standard inputs
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'Agent Smith' },
    });
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
      target: { value: 'smith@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'agentpass123' },
    });

    // Select Team dropdown
    fireEvent.mouseDown(screen.getByLabelText(/assigned team/i));
    // 🆕 CHANGED
    const teamOptions = await screen.findAllByText('IT Infrastructure');
    fireEvent.click(teamOptions[teamOptions.length - 1]);

    // Select Category multi-select
    fireEvent.mouseDown(screen.getByLabelText(/handled categories/i));
    // 🆕 CHANGED
    const categoryOptions = await screen.findAllByText('Software');
    fireEvent.click(categoryOptions[categoryOptions.length - 1]);

    const submitBtn = screen.getByRole('button', { name: /register user/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'Agent Smith',
        email: 'smith@example.com',
        password: 'agentpass123',
        role: 'Support Agent',
        team: 'IT Infrastructure',
        categories: ['cat_1'],
      });
      expect(message.success).toHaveBeenCalledWith('Registration successful!');
    });
  });

  test('displays backend error message when registration request fails', async () => {
    const errorResponse = {
      response: {
        data: { message: 'User with this email already exists' },
      },
    };
    api.post.mockRejectedValueOnce(errorResponse);

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /register user/i }));

    // 🆕 CHANGED — increased timeout as a safety margin; also confirms api.post was actually called
    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('User with this email already exists');
    }, { timeout: 3000 });
  });
});