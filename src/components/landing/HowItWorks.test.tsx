import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import en from '../../../messages/en.json';
import es from '../../../messages/es.json';

let messages: typeof en.HowItWorks = en.HowItWorks;

vi.mock('next-intl/server', () => ({
  getTranslations: async () => {
    const t = (key: 'heading') => messages[key];
    t.raw = (key: 'steps') => messages[key];
    return t;
  },
}));

import { HowItWorks } from './HowItWorks';

describe('HowItWorks', () => {
  it('renders the translated heading and every step in order', async () => {
    messages = en.HowItWorks;
    render(await HowItWorks());

    expect(screen.getByRole('heading', { level: 2, name: 'How it works' })).toBeInTheDocument();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(en.HowItWorks.steps.length);
    en.HowItWorks.steps.forEach((step, index) => {
      expect(within(items[index]).getByText(String(index + 1))).toBeInTheDocument();
      expect(
        within(items[index]).getByRole('heading', { level: 3, name: step.title }),
      ).toBeInTheDocument();
      expect(within(items[index]).getByText(step.description)).toBeInTheDocument();
    });
  });

  it('renders the Spanish steps when that locale is selected', async () => {
    messages = es.HowItWorks;
    render(await HowItWorks());

    expect(
      screen.getByRole('heading', { level: 2, name: es.HowItWorks.heading }),
    ).toBeInTheDocument();
    for (const step of es.HowItWorks.steps) {
      expect(screen.getByRole('heading', { level: 3, name: step.title })).toBeInTheDocument();
    }
  });
});
