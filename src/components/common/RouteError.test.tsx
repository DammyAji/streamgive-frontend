import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteError } from './RouteError';

describe('RouteError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls reset when Try again is clicked', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<RouteError error={new Error('boom')} reset={reset} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('can be retried with the keyboard', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<RouteError error={new Error('boom')} reset={reset} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('exposes the #main landmark, a level 1 heading and a non-submitting button', () => {
    const { container } = render(<RouteError error={new Error('boom')} reset={() => {}} />);

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(container.querySelector('main#main')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'We hit an unexpected issue.',
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveAttribute('type', 'button');
  });

  it('names what failed with the subject, defaulting to "This page"', () => {
    const { unmount } = render(<RouteError error={new Error('boom')} reset={() => {}} />);
    expect(screen.getByText(/^This page couldn’t be loaded right now/)).toBeInTheDocument();
    unmount();

    render(<RouteError error={new Error('boom')} reset={() => {}} subject="Your dashboard" />);
    expect(screen.getByText(/^Your dashboard couldn’t be loaded right now/)).toBeInTheDocument();
  });

  it('shows the error reference only when the error has a digest', () => {
    const { unmount } = render(<RouteError error={new Error('boom')} reset={() => {}} />);
    expect(screen.queryByText(/Error reference/)).not.toBeInTheDocument();
    unmount();

    render(
      <RouteError
        error={Object.assign(new Error('boom'), { digest: 'abc123' })}
        reset={() => {}}
      />,
    );
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText(/Error reference/)).toBeInTheDocument();
  });

  it('logs the error once and again when a different error replaces it', () => {
    const first = new Error('first');
    const second = new Error('second');
    const { rerender } = render(<RouteError error={first} reset={() => {}} />);

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenLastCalledWith(first);

    rerender(<RouteError error={first} reset={() => {}} />);
    expect(console.error).toHaveBeenCalledTimes(1);

    rerender(<RouteError error={second} reset={() => {}} />);
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenLastCalledWith(second);
  });
});
