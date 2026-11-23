import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NgoCardSkeleton } from './NgoCardSkeleton';

describe('NgoCardSkeleton', () => {
  it('is a busy list item so it can sit in the explorer list', () => {
    render(
      <ul>
        <NgoCardSkeleton />
      </ul>,
    );

    expect(screen.getByRole('listitem')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders three placeholder stats that respect reduced motion', () => {
    const { container } = render(
      <ul>
        <NgoCardSkeleton />
      </ul>,
    );

    expect(container.querySelectorAll('dl > div')).toHaveLength(3);
    expect(screen.getByRole('listitem')).toHaveClass('motion-reduce:animate-none');
  });
});
