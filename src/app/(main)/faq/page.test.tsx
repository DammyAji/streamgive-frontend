import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import en from '../../../../messages/en.json';
import es from '../../../../messages/es.json';

let messages: typeof en.Faq = en.Faq;

vi.mock('next-intl/server', () => ({
  getTranslations: async () => {
    const t = (key: 'title' | 'description') => messages[key];
    t.raw = (key: 'items') => messages[key];
    return t;
  },
}));

import FaqPage, { generateMetadata } from './page';

describe('FaqPage', () => {
  it('renders the heading and one accordion button per question', async () => {
    messages = en.Faq;
    render(await FaqPage());

    expect(
      screen.getByRole('heading', { level: 1, name: 'Frequently asked questions' }),
    ).toBeInTheDocument();
    for (const item of en.Faq.items) {
      expect(screen.getByRole('button', { name: item.question })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    }
  });

  it('covers fees, cancelling, refunds and wallets', () => {
    const questions = en.Faq.items.map((item) => item.question).join(' ');

    expect(questions).toMatch(/cost/i);
    expect(questions).toMatch(/cancel/i);
    expect(questions).toMatch(/refund/i);
    expect(questions).toMatch(/wallet/i);
  });

  it('renders the Spanish copy when that locale is selected', async () => {
    messages = es.Faq as typeof en.Faq;
    render(await FaqPage());

    expect(
      screen.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(es.Faq.items.length);
  });

  it('sets the page title and description from the translations', async () => {
    messages = en.Faq;

    await expect(generateMetadata()).resolves.toEqual({
      title: 'Frequently asked questions',
      description: en.Faq.description,
    });
  });

  it('keeps the English and Spanish FAQ the same length', () => {
    expect(es.Faq.items).toHaveLength(en.Faq.items.length);
  });
});
