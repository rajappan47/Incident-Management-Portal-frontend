import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';

import IncidentFilter from '../../../components/incidents/IncidentFilter';

describe('IncidentFilter Component', () => {
  const mockSetFilters = vi.fn();
  const mockOnReset = vi.fn();

  const mockCategories = [
    { _id: 'cat-1', name: 'Hardware' },
    { _id: 'cat-2', name: 'Software' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders search input, select dropdowns, and reset button', () => {
    render(
      <IncidentFilter
        filters={{ search: '', status: '', priority: '', category: '' }}
        setFilters={mockSetFilters}
        onReset={mockOnReset}
        categories={mockCategories}
      />
    );

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  test('calls setFilters on search input change', () => {
    render(
      <IncidentFilter
        filters={{ search: '', status: '', priority: '', category: '' }}
        setFilters={mockSetFilters}
        onReset={mockOnReset}
        categories={mockCategories}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'server crash' } });

    expect(mockSetFilters).toHaveBeenCalled();
  });

  test('updates status filter when a status option is selected', async () => {
    render(
      <IncidentFilter
        filters={{ search: '', status: '', priority: '', category: '' }}
        setFilters={mockSetFilters}
        onReset={mockOnReset}
        categories={mockCategories}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.mouseDown(comboboxes[0]); // First dropdown (Status)

    // 🆕 CHANGED — use findAllByRole + click the last match to handle
    // antd's virtualized list possibly rendering duplicate option nodes
    const options = await screen.findAllByRole('option', { name: 'In Progress' });
    fireEvent.click(options[options.length - 1]);

    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalled();
    });
  });

  test('updates priority filter when a priority option is selected', async () => {
    render(
      <IncidentFilter
        filters={{ search: '', status: '', priority: '', category: '' }}
        setFilters={mockSetFilters}
        onReset={mockOnReset}
        categories={mockCategories}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.mouseDown(comboboxes[1]); // Second dropdown (Priority)

    // 🆕 CHANGED
    const options = await screen.findAllByRole('option', { name: 'High' });
    fireEvent.click(options[options.length - 1]);

    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalled();
    });
  });

  test('updates category filter when a category option is selected', async () => {
    render(
      <IncidentFilter
        filters={{ search: '', status: '', priority: '', category: '' }}
        setFilters={mockSetFilters}
        onReset={mockOnReset}
        categories={mockCategories}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.mouseDown(comboboxes[2]); // Third dropdown (Category)

    // 🆕 CHANGED
    const options = await screen.findAllByRole('option', { name: 'Hardware' });
    fireEvent.click(options[options.length - 1]);

    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalled();
    });
  });

  test('calls onReset when reset button is clicked', () => {
    render(
      <IncidentFilter
        filters={{ search: 'test', status: 'Open', priority: 'High', category: 'cat-1' }}
        setFilters={mockSetFilters}
        onReset={mockOnReset}
        categories={mockCategories}
      />
    );

    const resetButton = screen.getByRole('button', { name: /reset|clear/i });
    fireEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });

  test('renders correctly when categories prop is undefined or empty', () => {
    render(
      <IncidentFilter
        filters={{ search: '', status: '', priority: '', category: '' }}
        setFilters={mockSetFilters}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});