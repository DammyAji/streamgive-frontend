'use client';

import { useId, useState } from 'react';

export type FaqItem = { question: string; answer: string };

/** Accordion following the WAI-ARIA disclosure pattern: each question is a
 * button inside a heading, and it controls the answer region below it.
 * Several answers can be open at once. */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());

  function toggle(index: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
      {items.map((item, index) => {
        const buttonId = `${baseId}-q${index}`;
        const panelId = `${baseId}-a${index}`;
        const isOpen = open.has(index);

        return (
          <div key={item.question}>
            <h2>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400"
              >
                <span>{item.question}</span>
                <span aria-hidden="true" className="text-xl leading-none">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-4 text-gray-600 dark:text-gray-400"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
