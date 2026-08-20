import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';

import CreateIncident from '../../pages/CreateIncident';
import api from '../../services/api';

// Mock API and React Router navigation
vi.mock('../../services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AppLayout component to render children cleanly
vi.mock('../../components/common/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

// Mock AttachmentUploader to simplify file upload testing
vi.mock('../../components/incidents/AttachmentUploader', () => ({
  default: ({ setFileList }) => (
    <input
      type="file"
      data-testid="file-uploader"
      onChange={(e) => setFileList([e.target.files[0]])}
    />
  ),
}));

// Helper to wrap the component with Antd App context and Router
const renderWithProviders = (ui) => {
  return render(
    <MemoryRouter>
      <App>{ui}</App>
    </MemoryRouter>
  );
};

describe('CreateIncident Component', () => {
  const mockCategories = [
    { _id: 'cat-1', name: 'Hardware' },
    { _id: 'cat-2', name: 'Software' },
  ];

  const mockAgents = [
    { _id: 'agent-1', name: 'Agent Smith', team: 'IT Support' },
    { _id: 'agent-2', name: 'Agent Brown', team: 'DevOps' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/categories') {
        return Promise.resolve({ data: mockCategories });
      }
      if (url === '/users/agents-by-category') {
        return Promise.resolve({ data: mockAgents });
      }
      return Promise.resolve({ data: [] });
    });
  });

  test('fetches and displays categories on mount', async () => {
    renderWithProviders(<CreateIncident />);

    expect(api.get).toHaveBeenCalledWith('/categories');

    // Open category dropdown
    const categorySelect = screen.getByLabelText(/category/i);
    fireEvent.mouseDown(categorySelect);

    await waitFor(() => {
      expect(screen.getByText('Hardware')).toBeInTheDocument();
      expect(screen.getByText('Software')).toBeInTheDocument();
    });
  });

  test('fetches agents dynamically when a category is selected', async () => {
    renderWithProviders(<CreateIncident />);

    // Open Category dropdown and select "Hardware"
    const categorySelect = screen.getByLabelText(/category/i);
    fireEvent.mouseDown(categorySelect);

    const hardwareOption = await screen.findByText('Hardware');
    fireEvent.click(hardwareOption);

    // Verify API call for category-specific agents
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/agents-by-category', {
        params: { categoryId: 'cat-1' },
      });
    });

    // Open Agent dropdown and check options
    const agentSelect = screen.getByLabelText(/assign support agent/i);
    fireEvent.mouseDown(agentSelect);

    expect(await screen.findByText('Agent Smith (IT Support)')).toBeInTheDocument();
    expect(screen.getByText('Agent Brown (DevOps)')).toBeInTheDocument();
  });

  test('displays validation errors when submitting an empty form', async () => {
    renderWithProviders(<CreateIncident />);

    const submitBtn = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Please enter an incident title')).toBeInTheDocument();
      expect(screen.getByText('Please select a category')).toBeInTheDocument();
      expect(screen.getByText('Please provide issue details')).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  test('submits form successfully with attachment and navigates to incidents list', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    renderWithProviders(<CreateIncident />);

    // Fill Title
    fireEvent.change(screen.getByLabelText(/incident title/i), {
      target: { value: 'Laptop Screen Flickering' },
    });

    // Select Category
    const categorySelect = screen.getByLabelText(/category/i);
    fireEvent.mouseDown(categorySelect);
    const hardwareOption = await screen.findByText('Hardware');
    fireEvent.click(hardwareOption);

    // Fill Description
    fireEvent.change(screen.getByLabelText(/detailed description/i), {
      target: { value: 'The screen turns black intermittently during operation.' },
    });

    // Upload Mock File
    const file = new File(['dummy content'], 'screenshot.png', { type: 'image/png' });
    const fileInput = screen.getByTestId('file-uploader');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit Form
    const submitBtn = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/incidents', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Verify navigate was triggered after submission success
      expect(mockNavigate).toHaveBeenCalledWith('/incidents');
    });
  });

  test('handles API error during form submission gracefully', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Failed to create ticket' } },
    });

    renderWithProviders(<CreateIncident />);

    // Fill Title
    fireEvent.change(screen.getByLabelText(/incident title/i), {
      target: { value: 'Software Crash' },
    });

    // Select Category
    const categorySelect = screen.getByLabelText(/category/i);
    fireEvent.mouseDown(categorySelect);
    const softwareOption = await screen.findByText('Software');
    fireEvent.click(softwareOption);

    // Fill Description
    fireEvent.change(screen.getByLabelText(/detailed description/i), {
      target: { value: 'App closes unexpectedly on startup.' },
    });

    // Submit Form
    const submitBtn = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('navigates back when "Back to Incidents" or "Cancel" is clicked', async () => {
    renderWithProviders(<CreateIncident />);

    const backButton = screen.getByRole('button', { name: /back to incidents/i });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/incidents');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(mockNavigate).toHaveBeenCalledWith('/incidents');
  });
});