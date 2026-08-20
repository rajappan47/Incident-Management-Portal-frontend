import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { message } from 'antd';
import AttachmentUploader from '../../../components/incidents/AttachmentUploader';

// Mock Ant Design's message module
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      error: vi.fn(),
      success: vi.fn(),
    },
  };
});

describe('AttachmentUploader Component', () => {
  const mockSetFileList = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload button with correct helper text', () => {
    render(<AttachmentUploader fileList={[]} setFileList={mockSetFileList} />);

    expect(
      screen.getByRole('button', {
        name: /select attachment \(jpg, png, pdf — max 6mb\)/i,
      })
    ).toBeInTheDocument();
  });

  it('accepts a valid file (PNG, under 6MB) and updates fileList', async () => {
    const { container } = render(
      <AttachmentUploader fileList={[]} setFileList={mockSetFileList} />
    );

    const validFile = new File(['sample content'], 'test-image.png', {
      type: 'image/png',
    });
    Object.defineProperty(validFile, 'size', { value: 2 * 1024 * 1024 }); // 2MB

    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockSetFileList).toHaveBeenCalledWith([validFile]);
    });
    expect(message.error).not.toHaveBeenCalled();
  });

  it('accepts a valid PDF file under 6MB', async () => {
    const { container } = render(
      <AttachmentUploader fileList={[]} setFileList={mockSetFileList} />
    );

    const validPdf = new File(['pdf content'], 'document.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(validPdf, 'size', { value: 1 * 1024 * 1024 }); // 1MB

    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [validPdf] } });

    await waitFor(() => {
      expect(mockSetFileList).toHaveBeenCalledWith([validPdf]);
    });
  });

  it('rejects invalid file type (e.g., TXT or EXE) and displays error message', async () => {
    const { container } = render(
      <AttachmentUploader fileList={[]} setFileList={mockSetFileList} />
    );

    const invalidFile = new File(['text content'], 'document.txt', {
      type: 'text/plain',
    });

    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith(
        '"document.txt" is not a valid file type! Only JPG, PNG, and PDF are allowed.'
      );
    });
    expect(mockSetFileList).not.toHaveBeenCalled();
  });

  it('rejects files larger than 6MB and displays size error message', async () => {
    const { container } = render(
      <AttachmentUploader fileList={[]} setFileList={mockSetFileList} />
    );

    const oversizedFile = new File(['large content'], 'large-file.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(oversizedFile, 'size', { value: 7 * 1024 * 1024 }); // 7MB

    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith(
        '"large-file.pdf" is 7.0MB — file must be smaller than 6MB!'
      );
    });
    expect(mockSetFileList).not.toHaveBeenCalled();
  });

  it('removes file from fileList when remove button is clicked', async () => {
    const file1 = { uid: '1', name: 'test1.png', type: 'image/png', size: 1000 };
    const file2 = { uid: '2', name: 'test2.pdf', type: 'application/pdf', size: 1000 };

    const { container } = render(
      <AttachmentUploader fileList={[file1, file2]} setFileList={mockSetFileList} />
    );

    const removeIcons = container.querySelectorAll('.anticon-delete, .anticon-trash');
    if (removeIcons.length > 0) {
      fireEvent.click(removeIcons[0]);
    } else {
      const removeBtn = container.querySelector('.ant-upload-list-item-card-actions button');
      if (removeBtn) fireEvent.click(removeBtn);
    }

    await waitFor(() => {
      expect(mockSetFileList).toHaveBeenCalledWith([file2]);
    });
  });
});