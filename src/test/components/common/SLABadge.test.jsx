import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SLABadge from '../../../components/common/SLABadge';

describe('SLABadge Component', () => {
  it('renders "Overdue" badge with error color when isOverdue is true', () => {
    const { container } = render(<SLABadge isOverdue={true} />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
    
    const tagElement = container.querySelector('.ant-tag');
    expect(tagElement).toHaveClass('ant-tag-error');
  });

  it('renders "On Time" badge with success color when isOverdue is false', () => {
    const { container } = render(<SLABadge isOverdue={false} />);

    expect(screen.getByText('On Time')).toBeInTheDocument();

    const tagElement = container.querySelector('.ant-tag');
    expect(tagElement).toHaveClass('ant-tag-success');
  });

  it('renders "On Time" badge by default when isOverdue prop is undefined or falsy', () => {
    const { container } = render(<SLABadge />);

    expect(screen.getByText('On Time')).toBeInTheDocument();

    const tagElement = container.querySelector('.ant-tag');
    expect(tagElement).toHaveClass('ant-tag-success');
  });
});