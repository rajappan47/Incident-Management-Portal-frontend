import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect } from 'vitest';
import PriorityBadge from '../../../components/common/PriorityBadge';

vi.mock('../../../config/constants', () => ({
  PRIORITY_COLORS: {
    High: 'red',
    Medium: 'orange',
    Low: 'green',
    Critical: 'magenta',
  },
}));

describe('PriorityBadge Component', () => {
  it('renders correctly with given priority text', () => {
    render(<PriorityBadge priority="High" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('applies the correct color from PRIORITY_COLORS for known priority', () => {
    const { container } = render(<PriorityBadge priority="High" />);
    const tagElement = container.querySelector('.ant-tag');
    
    expect(tagElement).toHaveClass('ant-tag-red');
  });

  it('falls back to "default" color when priority is not mapped in PRIORITY_COLORS', () => {
    const { container } = render(<PriorityBadge priority="UnknownPriority" />);
    const tagElement = container.querySelector('.ant-tag');
    
    expect(screen.getByText('UnknownPriority')).toBeInTheDocument();
    expect(tagElement).not.toHaveClass('ant-tag-red');
  });

  it('defaults priority text to "Low" when priority prop is null or undefined', () => {
    render(<PriorityBadge priority={undefined} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});