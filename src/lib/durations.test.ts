import { describe, expect, it } from 'vitest';

import { DURATIONS } from './durations';

describe('DURATIONS', () => {
  it('has the expected number of seconds for each preset', () => {
    // 7 days, 30 days, 90 days, 365 days
    expect(DURATIONS.map((d) => d.seconds)).toEqual([604_800, 2_592_000, 7_776_000, 31_536_000]);
  });

  it('is ordered from shortest to longest', () => {
    const seconds = DURATIONS.map((d) => d.seconds);
    expect(seconds).toEqual([...seconds].sort((a, b) => a - b));
  });
});
