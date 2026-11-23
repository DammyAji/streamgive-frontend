import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatsStripSkeleton } from './StatsStripSkeleton';

describe('StatsStripSkeleton', () => {
  it('announces the loading state through a status region', () => {
    render(<StatsStripSkeleton />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading platform stats…');
  });

  it('renders three placeholder stats that respect reduced motion', () => {
    const { container } = render(<StatsStripSkeleton />);

    expect(container.querySelectorAll('dl > div')).toHaveLength(3);
    expect(container.querySelector('dl')).toHaveClass('motion-reduce:animate-none');
  });
});
