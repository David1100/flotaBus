import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { intervalsOverlap, STATE_TRANSITIONS, TripsService } from './trips.service';

describe('route management critical rules', () => {
  it('uses half-open intervals so adjacent assignments are allowed and real overlaps are rejected', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-02T00:00:00Z');
    expect(intervalsOverlap(start, end, end, new Date('2026-01-03T00:00:00Z'))).toBe(false);
    expect(intervalsOverlap(start, end, new Date('2026-01-01T12:00:00Z'), new Date('2026-01-02T12:00:00Z'))).toBe(true);
  });

  it('declares STOPPED and lunch transitions while rejecting invalid moves', () => {
    expect(STATE_TRANSITIONS.STOPPED).toEqual({ from: ['IN_TRANSIT'], to: 'STOPPED' });
    expect(STATE_TRANSITIONS.LUNCH_STARTED).toEqual({ from: ['IN_TRANSIT'], to: 'PAUSED_LUNCH' });
    expect(STATE_TRANSITIONS.RETURNED.from).toEqual(['ARRIVED']);
  });

  it('denies an unassigned driver before loading or mutating the trip', async () => {
    const db = { trip: { findUnique: jest.fn().mockResolvedValue({ id: 10, assignments: [{ driverId: 8 }] }) } } as any;
    const service = new TripsService(db);
    await expect((service as any).assertTripAccess(10, { id: 9, rol: 'CHOFER' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.trip.findUnique).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown event types instead of changing the derived state', async () => {
    const db = { trip: { findUnique: jest.fn().mockResolvedValue({ id: 10, status: 'IN_TRANSIT', assignments: [{ driverId: 8 }], legs: [] }) } } as any;
    const service = new TripsService(db);
    await expect(service.event(10, { type: 'NOT_A_STATE' }, { id: 8, rol: 'CHOFER' })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).toBeUndefined();
  });
});
