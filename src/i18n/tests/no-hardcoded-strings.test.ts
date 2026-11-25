import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Files for pages that already read their copy from messages/*.json. Add a
// path here when a page gets translated so it is checked from then on.
const TRANSLATED_FILES = [
  'src/app/(main)/page.tsx',
  ...listTsx('src/components/landing'),
  ...listTsx('src/components/layout'),
  ...listTsx('src/components/faq'),
];

// Literals that are fine to leave in JSX text, such as brand names.
const ALLOWLIST = new Set<string>(['StreamGive']);

function listTsx(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir))
    .filter((name) => name.endsWith('.tsx') && !name.includes('.test.'))
    .map((name) => `${dir}/${name}`);
}

// Text sitting between a closing `>` and the next `<`. Lines with code
// punctuation are skipped so ternaries and generics are not mistaken for copy.
function findJsxTextLiterals(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/(?<![=-])>([^<>{}]*)</g)) {
    const text = match[1].trim();
    if (!/[A-Za-z]/.test(text) || /[();=?]/.test(text)) continue;
    if (!ALLOWLIST.has(text)) found.push(text);
  }
  return found;
}

describe('translated pages', () => {
  it.each(TRANSLATED_FILES)('%s has no hard-coded JSX text', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    expect(findJsxTextLiterals(source)).toEqual([]);
  });

  it('flags an English literal in JSX', () => {
    expect(findJsxTextLiterals('<p className="a">Hello there</p>')).toEqual(['Hello there']);
  });
});
