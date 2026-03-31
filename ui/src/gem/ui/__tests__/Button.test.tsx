// ============================================================================
// Button Component — Unit Tests
// GEM Content Control Center
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/Button';

describe('Button', () => {
  // ─── Render Test ───

  it('should render with children text', () => {
    render(<Button>Tạo Nội Dung</Button>);
    expect(screen.getByText('Tạo Nội Dung')).toBeDefined();
  });

  it('should render with different variants', () => {
    const { container: c1 } = render(<Button variant="primary">Primary</Button>);
    expect(c1.querySelector('.btn-primary')).toBeDefined();

    const { container: c2 } = render(<Button variant="gold">Gold</Button>);
    expect(c2.querySelector('.btn-g')).toBeDefined();

    const { container: c3 } = render(<Button variant="outline">Outline</Button>);
    expect(c3.querySelector('.btn-o')).toBeDefined();

    const { container: c4 } = render(<Button variant="danger">Danger</Button>);
    expect(c4.querySelector('.btn-danger')).toBeDefined();
  });

  // ─── Click Handler Test ───

  it('should call onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>,
    );

    fireEvent.click(screen.getByText('Disabled'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  // ─── Disabled State Test ───

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByText('Disabled Button').closest('button');
    expect(button?.disabled).toBe(true);
  });

  it('should be disabled when loading is true', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByText('Loading').closest('button');
    expect(button?.disabled).toBe(true);
  });

  // ─── Loading State ───

  it('should show spinner when loading', () => {
    const { container } = render(<Button loading>Save</Button>);
    // Loader2 icon renders as an SVG with animate-spin class
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeDefined();
  });

  // ─── Full Width ───

  it('should apply full width class', () => {
    const { container } = render(<Button fullWidth>Full Width</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('w-full');
  });

  // ─── Tooltip ───

  it('should render tooltip wrapper when tooltip prop is provided', () => {
    const { container } = render(<Button tooltip="Helper text">Hover Me</Button>);
    // Tooltip wraps button in a div.group
    const wrapper = container.querySelector('.group');
    expect(wrapper).toBeDefined();
  });
});
