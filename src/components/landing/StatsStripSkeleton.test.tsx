import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/renderWithIntl';

import { StatsStripSkeleton } from './StatsStripSkeleton';

describe('StatsStripSkeleton', () => {
  it('announces the loading state through a status region', () => {
    renderWithIntl(<StatsStripSkeleton />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading platform stats…');
  });

  it('announces the loading state in Spanish', () => {
    renderWithIntl(<StatsStripSkeleton />, 'es');

    expect(screen.getByRole('status')).toHaveTextContent('Cargando estadísticas de la plataforma…');
  });

  it('renders three placeholder stats that respect reduced motion', () => {
    const { container } = renderWithIntl(<StatsStripSkeleton />);

    expect(container.querySelectorAll('dl > div')).toHaveLength(3);
    expect(container.querySelector('dl')).toHaveClass('motion-reduce:animate-none');
  });
});
