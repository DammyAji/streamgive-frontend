import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RouteLoading } from './RouteLoading';

describe('RouteLoading', () => {
  it('renders a busy #main landmark', () => {
    const { container } = render(<RouteLoading />);

    expect(container.querySelector('main#main[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
  });

  it('announces the loading state through a status region', () => {
    render(<RouteLoading />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading…');
    expect(screen.getByText('Loading…')).toHaveClass('sr-only');
  });

  it('shows a visible heading when a title is given', () => {
    render(<RouteLoading title="Your donations" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Your donations' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('renders no heading without a title', () => {
    render(<RouteLoading />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('hides the placeholder rows from assistive technology', () => {
    const { container } = render(<RouteLoading />);

    const rows = container.querySelector('[aria-hidden="true"]');
    expect(rows).not.toBeNull();
    expect(rows?.children).toHaveLength(4);
    expect(screen.getByRole('status')).not.toContainElement(rows as HTMLElement);
  });
});
