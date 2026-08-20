import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App } from 'antd';

import AdminCategories from '../../pages/AdminCategories';
import api from '../../services/api';

vi.mock('../../services/api');

const renderWithAntdApp = (ui) => {
  return render(<App>{ui}</App>);
};

describe('AdminCategories Component', () => {
  const mockCategories = [
    {
      _id: 'cat-1',
      name: 'Hardware',
      description: 'Physical equipment issues',
      createdAt: '2026-01-15T10:00:00.000Z',
    },
    {
      _id: 'cat-2',
      name: 'Software',
      description: 'Application and OS errors',
      createdAt: '2026-02-10T12:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: mockCategories } });
  });

  test('fetches and renders categories list on mount', async () => {
    renderWithAntdApp(<AdminCategories />);

    expect(api.get).toHaveBeenCalledWith('/categories');

    await waitFor(() => {
      expect(screen.getByText('Hardware')).toBeInTheDocument();
      expect(screen.getByText('Software')).toBeInTheDocument();
      expect(screen.getByText('Physical equipment issues')).toBeInTheDocument();
    });
  });

  test('opens add category modal and creates a new category', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    renderWithAntdApp(<AdminCategories />);

    await waitFor(() => expect(screen.getByText('Hardware')).toBeInTheDocument());

    const addButton = screen.getByRole('button', { name: /add category/i });
    fireEvent.click(addButton);

    expect(screen.getByText('Add New Category')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/category name/i);
    const descInput = screen.getByLabelText(/description/i);

    fireEvent.change(nameInput, { target: { value: 'Network' } });
    fireEvent.change(descInput, { target: { value: 'Connectivity issues' } });

    const createButton = screen.getByRole('button', { name: /^create$/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/categories', {
        name: 'Network',
        description: 'Connectivity issues',
      });
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  test('opens edit modal with pre-filled fields and updates category', async () => {
    api.put.mockResolvedValueOnce({ data: { success: true } });

    renderWithAntdApp(<AdminCategories />);

    await waitFor(() => expect(screen.getByText('Hardware')).toBeInTheDocument());

    const row = screen.getByText('Hardware').closest('tr');
    const editBtn = row.querySelector('.anticon-edit').closest('button');
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Category')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hardware')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/category name/i);
    fireEvent.change(nameInput, { target: { value: 'Hardware & Devices' } });

    const updateButton = screen.getByRole('button', { name: /^update$/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/categories/cat-1', {
        name: 'Hardware & Devices',
        description: 'Physical equipment issues',
      });
    });
  });

  test('deletes a category after popconfirm approval', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } });

    renderWithAntdApp(<AdminCategories />);

    await waitFor(() => expect(screen.getByText('Hardware')).toBeInTheDocument());

    const row = screen.getByText('Hardware').closest('tr');
    const deleteBtn = row.querySelector('.anticon-delete').closest('button');
    fireEvent.click(deleteBtn);

    const confirmButton = await screen.findByRole('button', { name: /yes, delete/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/categories/cat-1');
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });
});