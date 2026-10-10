import { addDays, deriveLegs } from './dates';

describe('trip date calculations', () => {
  it('adds whole days across midnight without changing the time', () => {
    const start = new Date('2026-10-10T22:00:00.000Z');
    expect(addDays(start, 2).toISOString()).toBe('2026-10-12T22:00:00.000Z');
  });

  it('derives the next departure from the previous estimated arrival', () => {
    const legs = deriveLegs([
      { origin: 'A', destination: 'B', durationDays: 2 },
      { origin: 'B', destination: 'A', durationDays: 1 },
    ], new Date('2026-10-10T22:00:00.000Z'));
    expect(legs[0].plannedArrivalAt.toISOString()).toBe('2026-10-12T22:00:00.000Z');
    expect(legs[1].plannedDepartureAt.toISOString()).toBe('2026-10-12T22:00:00.000Z');
  });
});
