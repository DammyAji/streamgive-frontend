import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FaqAccordion } from './FaqAccordion';

const items = [
  { question: 'What is a stream?', answer: 'A recurring donation.' },
  { question: 'Can I cancel?', answer: 'Yes, at any time.' },
];

describe('FaqAccordion', () => {
  it('renders every question as a collapsed button with its answer hidden', () => {
    render(<FaqAccordion items={items} />);

    for (const item of items) {
      const button = screen.getByRole('button', { name: item.question });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(item.answer)).not.toBeVisible();
    }
  });

  it('puts each question button inside a heading', () => {
    render(<FaqAccordion items={items} />);

    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'What is a stream?+',
      'Can I cancel?+',
    ]);
  });

  it('reveals and hides an answer when its question is clicked', async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={items} />);
    const button = screen.getByRole('button', { name: 'What is a stream?' });

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('A recurring donation.')).toBeVisible();

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('A recurring donation.')).not.toBeVisible();
  });

  it('opens and closes with the keyboard', async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={items} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'What is a stream?' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('A recurring donation.')).toBeVisible();
    await user.keyboard(' ');
    expect(screen.queryByText('A recurring donation.')).not.toBeVisible();
  });

  it('keeps other answers open when another one is opened', async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={items} />);

    await user.click(screen.getByRole('button', { name: 'What is a stream?' }));
    await user.click(screen.getByRole('button', { name: 'Can I cancel?' }));

    expect(screen.getByText('A recurring donation.')).toBeVisible();
    expect(screen.getByText('Yes, at any time.')).toBeVisible();
  });

  it('links each button to a labelled answer region through aria-controls', async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={items} />);
    const button = screen.getByRole('button', { name: 'Can I cancel?' });

    await user.click(button);

    const region = screen.getByRole('region', { name: 'Can I cancel?' });
    expect(button).toHaveAttribute('aria-controls', region.id);
    expect(region).toHaveTextContent('Yes, at any time.');
  });
});
