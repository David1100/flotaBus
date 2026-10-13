import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { TripsService } from './trips.service';

const whatsappStub = { notifyAdmin: jest.fn().mockResolvedValue(undefined) };
const actor = (id: number, rol: string = 'CHOFER') => ({ id, rol });
const start = new Date('2026-10-10T22:00:00.000Z');

const tripWith = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  origin: 'Bucaramanga',
  initialStartAt: start,
  status: 'PLANNED',
  assignments: [],
  legs: [],
  ...overrides,
});

describe('TripsService runtime scenarios', () => {
  it('allows an assigned driver and rejects an unassigned or revoked driver', async () => {
    const findUnique = jest.fn().mockResolvedValue(tripWith({
      assignments: [{ driverId: 7, status: 'ACTIVE' }],
    }));
    const service = new TripsService({ trip: { findUnique } } as any, whatsappStub as any);

    await expect((service as any).assertTripAccess(10, actor(7))).resolves.toEqual(expect.objectContaining({ id: 10 }));
    await expect((service as any).assertTripAccess(10, actor(8))).rejects.toBeInstanceOf(ForbiddenException);

    findUnique.mockResolvedValue(tripWith({ assignments: [] }));
    await expect((service as any).assertTripAccess(10, actor(7))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('locks the trip for PATCH immediately after the driver starts it', async () => {
    const trip = tripWith({
      status: 'ASSIGNED',
      assignments: [{ driverId: 7, status: 'ACTIVE' }],
    });
    const db = eventDb(trip);
    const service = new TripsService(db as any, whatsappStub as any);
    (service as any).get = jest.fn().mockResolvedValue({ status: 'IN_TRANSIT' });

    await service.event(10, { type: 'STARTED' }, actor(7));
    expect(db.tx.trip.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'IN_TRANSIT' },
    }));

    db.trip.findUnique.mockResolvedValue(tripWith({
      status: 'IN_TRANSIT',
      assignments: [{ driverId: 7, status: 'ACTIVE' }],
    }));
    await expect(service.update(10, {
      origin: 'Cali',
      initialStartAt: '2026-10-11T08:00:00.000Z',
      notes: 'Intento no permitido',
    })).rejects.toThrow('Sólo se puede editar un viaje que aún no ha iniciado.');
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('filters the driver board to active assignments only', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new TripsService({ trip: { findMany } } as any, whatsappStub as any);

    await service.list(undefined, actor(7));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assignments: { some: { driverId: 7, status: 'ACTIVE' } } },
    }));
  });

  it.each([
    ['starts an assigned trip', 'ASSIGNED', 'STARTED', 'IN_TRANSIT'],
    ['stops an in-transit trip', 'IN_TRANSIT', 'STOPPED', 'STOPPED'],
    ['starts lunch', 'IN_TRANSIT', 'LUNCH_STARTED', 'PAUSED_LUNCH'],
    ['resumes lunch', 'PAUSED_LUNCH', 'LUNCH_ENDED', 'IN_TRANSIT'],
    ['records an incident', 'STOPPED', 'INCIDENT', 'INCIDENT'],
    ['records an incident before departure', 'ASSIGNED', 'INCIDENT', 'INCIDENT'],
    ['resolves an incident', 'INCIDENT', 'INCIDENT_RESOLVED', 'IN_TRANSIT'],
    ['records arrival', 'IN_TRANSIT', 'ARRIVED', 'ARRIVED'],
  ])('%s through the event command', async (_name, status, type, nextStatus) => {
    const trip = tripWith({ status, assignments: [{ driverId: 7, status: 'ACTIVE' }] });
    const db = eventDb(trip);
    const service = new TripsService(db as any, whatsappStub as any);
    (service as any).get = jest.fn().mockResolvedValue({ status: nextStatus });

    await expect(service.event(10, { type, occurredAt: '2026-10-11T08:00:00.000Z' }, actor(7))).resolves.toEqual({ status: nextStatus });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.tx.trip.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: nextStatus } }));
    expect(db.tx.operationEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type, actorId: 7 }),
    }));
  });

  it('rejects invalid transitions and does not open a transaction', async () => {
    const db = eventDb(tripWith({ status: 'PLANNED', assignments: [{ driverId: 7, status: 'ACTIVE' }] }));
    const service = new TripsService(db as any, whatsappStub as any);

    await expect(service.event(10, { type: 'ARRIVED' }, actor(7))).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('makes repeated events idempotent and does not duplicate the event', async () => {
    const db = eventDb(tripWith({ status: 'IN_TRANSIT', assignments: [{ driverId: 7, status: 'ACTIVE' }] }));
    const service = new TripsService(db as any, whatsappStub as any);
    (service as any).get = jest.fn().mockResolvedValue({ status: 'IN_TRANSIT' });

    await service.event(10, { type: 'STARTED' }, actor(7));
    await service.event(10, { type: 'STARTED' }, actor(7));
    expect(db.$transaction).not.toHaveBeenCalled();
    expect((service as any).get).toHaveBeenCalledTimes(2);
  });

  it('stores lunch resume timestamps and actual start/arrival timestamps', async () => {
    const lunchDb = eventDb(tripWith({ status: 'PAUSED_LUNCH', assignments: [{ driverId: 7, status: 'ACTIVE' }] }));
    const lunchService = new TripsService(lunchDb as any, whatsappStub as any);
    (lunchService as any).get = jest.fn().mockResolvedValue({ status: 'IN_TRANSIT' });
    await lunchService.event(10, {
      type: 'LUNCH_ENDED',
      occurredAt: '2026-10-11T12:00:00.000Z',
      resumedAt: '2026-10-11T12:15:00.000Z',
    }, actor(7));
    expect(lunchDb.tx.operationEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ resumedAt: new Date('2026-10-11T12:15:00.000Z') }),
    }));

    const executionDb = eventDb(tripWith({
      status: 'ASSIGNED', assignments: [{ driverId: 7, status: 'ACTIVE' }], legs: [{ id: 4 }],
    }));
    const executionService = new TripsService(executionDb as any, whatsappStub as any);
    (executionService as any).get = jest.fn().mockResolvedValue({ status: 'IN_TRANSIT' });
    await executionService.event(10, { type: 'STARTED', occurredAt: '2026-10-11T08:00:00.000Z' }, actor(7));
    expect(executionDb.tx.legExecution.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'RUNNING', actualDepartureAt: new Date('2026-10-11T08:00:00.000Z') },
    }));

    executionDb.trip.findUnique.mockResolvedValue(tripWith({
      status: 'IN_TRANSIT', assignments: [{ driverId: 7, status: 'ACTIVE' }], legs: [{ id: 4 }],
    }));
    (executionService as any).get = jest.fn().mockResolvedValue({ status: 'ARRIVED' });
    await executionService.event(10, { type: 'ARRIVED', occurredAt: '2026-10-12T10:00:00.000Z' }, actor(7));
    expect(executionDb.tx.legExecution.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'FINISHED', actualArrivalAt: new Date('2026-10-12T10:00:00.000Z') },
    }));
  });

  it('rejects return unless the final destination is the persisted origin', async () => {
    const db = eventDb(tripWith({
      status: 'ARRIVED',
      origin: 'Bucaramanga',
      assignments: [{ driverId: 7, status: 'ACTIVE' }],
      legs: [{ id: 2, destination: 'Bogotá' }],
    }));
    const service = new TripsService(db as any, whatsappStub as any);

    await expect(service.event(10, { type: 'RETURNED' }, actor(7))).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('confirms return separately from arrival and records the real duration timestamps', async () => {
    const db = eventDb(tripWith({
      status: 'ARRIVED',
      assignments: [{ driverId: 7, status: 'ACTIVE' }],
      legs: [{ id: 2, destination: 'Bucaramanga' }],
    }));
    const service = new TripsService(db as any, whatsappStub as any);
    (service as any).get = jest.fn().mockResolvedValue({ status: 'RETURNED' });

    await service.event(10, { type: 'RETURNED', occurredAt: '2026-10-12T06:00:00.000Z' }, actor(7));
    expect(db.tx.trip.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'RETURNED' } }));

    const actualDeparture = new Date('2026-10-10T23:00:00.000Z');
    const actualArrival = new Date('2026-10-12T01:00:00.000Z');
    expect((actualArrival.getTime() - actualDeparture.getTime()) / 3_600_000).toBe(26);
  });

  it('audits the assigning administrator and rejects bus or driver interval conflicts', async () => {
    const trip = tripWith({
      legs: [{ plannedArrivalAt: new Date('2026-10-12T22:00:00.000Z') }],
    });
    const assignmentCreate = jest.fn().mockResolvedValue({ id: 55 });
    const tx = {
      trip: { update: jest.fn() },
      assignment: { create: assignmentCreate },
    };
    const db = {
      trip: { findUnique: jest.fn().mockResolvedValue(trip) },
       bus: { findUnique: jest.fn().mockResolvedValue({ id: 3, isActive: true }) },
       user: { findUnique: jest.fn().mockResolvedValue({ id: 7, rol: 'CHOFER', isActive: true }), findMany: jest.fn().mockResolvedValue([{ id: 7, rol: 'CHOFER', isActive: true }]) },
       assignment: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const service = new TripsService(db as any, whatsappStub as any);

    await service.assign(10, { busId: 3, driverId: 7 }, 99);
    expect(assignmentCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assignedById: 99 }) }));

    db.assignment.findMany.mockResolvedValue([{
      trip: { initialStartAt: new Date('2026-10-11T00:00:00.000Z'), legs: [{ plannedArrivalAt: new Date('2026-10-13T00:00:00.000Z') }] },
    }]);
    await expect(service.assign(10, { busId: 3, driverId: 7 }, 99)).rejects.toBeInstanceOf(ConflictException);
    expect(assignmentCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects an inactive bus before creating an assignment', async () => {
    const assignmentCreate = jest.fn();
    const db = {
      trip: { findUnique: jest.fn().mockResolvedValue(tripWith({ legs: [{ plannedArrivalAt: new Date('2026-10-12T22:00:00.000Z') }] })) },
      bus: { findUnique: jest.fn().mockResolvedValue({ id: 3, isActive: false }) },
       user: { findUnique: jest.fn().mockResolvedValue({ id: 7, rol: 'CHOFER', isActive: true }), findMany: jest.fn().mockResolvedValue([{ id: 7, rol: 'CHOFER', isActive: true }]) },
       assignment: { findMany: jest.fn(), create: assignmentCreate },
    };

    await expect(new TripsService(db as any, whatsappStub as any).assign(10, { busId: 3, driverId: 7 }, 99)).rejects.toBeInstanceOf(BadRequestException);
    expect(assignmentCreate).not.toHaveBeenCalled();
  });

  it('validates complete route continuity and preserves derived dates after editing', async () => {
    const tx = {
      trip: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue(tripWith()) },
      tripLeg: { update: jest.fn() },
    };
    const db = {
      trip: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(tripWith({
          legs: [
            { id: 1, origin: 'Bucaramanga', destination: 'Bogotá', plannedDepartureAt: start, plannedArrivalAt: new Date('2026-10-11T22:00:00.000Z'), durationDays: 1, notes: null },
            { id: 2, origin: 'Bogotá', destination: 'Bucaramanga', plannedDepartureAt: new Date('2026-10-11T22:00:00.000Z'), plannedArrivalAt: new Date('2026-10-12T22:00:00.000Z'), durationDays: 1, notes: null },
          ],
        })),
      },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const service = new TripsService(db as any, whatsappStub as any);

    await expect(service.create({
      code: 'T-1', origin: 'Bucaramanga', initialStartAt: start.toISOString(),
      legs: [{ origin: 'Bogotá', destination: 'Bucaramanga', plannedDepartureAt: start.toISOString(), durationDays: 1 }],
    } as any, 99)).rejects.toBeInstanceOf(BadRequestException);

    const invalidDuration = { origin: 'Bucaramanga', destination: 'Bogotá', plannedDepartureAt: start.toISOString(), durationDays: 0 };
    await expect(service.create({ code: 'T-2', origin: 'Bucaramanga', initialStartAt: start.toISOString(), legs: [invalidDuration] } as any, 99)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.trip.create).not.toHaveBeenCalled();

    await service.editLeg(10, 1, {
      origin: 'Bucaramanga', destination: 'Bogotá',
      plannedDepartureAt: '2026-10-11T22:00:00.000Z', durationDays: 2,
    });
    expect(tx.tripLeg.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 },
      data: expect.objectContaining({
        plannedDepartureAt: new Date('2026-10-11T22:00:00.000Z'),
        plannedArrivalAt: new Date('2026-10-13T22:00:00.000Z'),
      }),
    }));
    expect(tx.tripLeg.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 2 },
      data: expect.objectContaining({
        plannedArrivalAt: new Date('2026-10-12T22:00:00.000Z'),
      }),
    }));
  });

  it('allows editing an assigned trip before operation starts', async () => {
    const tx = {
      trip: { update: jest.fn().mockResolvedValue({ id: 10, status: 'ASSIGNED' }) },
      tripLeg: { update: jest.fn() },
    };
    const db = {
      trip: {
        findUnique: jest.fn().mockResolvedValue(tripWith({
          status: 'ASSIGNED',
          assignments: [{ busId: 3, driverId: 7 }],
          legs: [{ id: 1, origin: 'Bucaramanga', destination: 'Bogotá', plannedDepartureAt: start, durationDays: 1, notes: null }],
        })),
      },
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };

    await expect(new TripsService(db as any, whatsappStub as any).update(10, { notes: 'Ajuste previo a salida' })).resolves.toEqual(expect.objectContaining({ status: 'ASSIGNED' }));
    expect(tx.trip.update).toHaveBeenCalled();
  });

  it.each(['IN_TRANSIT', 'EN_ROUTE', 'STOPPED', 'PAUSED_LUNCH', 'REFUELING', 'INCIDENT', 'ARRIVED', 'RETURNED', 'COMPLETED', 'CANCELLED'])('blocks editing after operation starts from %s', async (status) => {
    const db = {
      trip: { findUnique: jest.fn().mockResolvedValue(tripWith({ status })) },
    };

    await expect(new TripsService(db as any, whatsappStub as any).update(10, { notes: 'No debe cambiar' })).rejects.toThrow('Sólo se puede editar un viaje que aún no ha iniciado.');
  });
});

function eventDb(trip: any) {
  const tx = {
    legExecution: {
      upsert: jest.fn().mockResolvedValue({ id: 31 }),
      update: jest.fn(),
    },
    operationEvent: { create: jest.fn() },
    trip: { update: jest.fn() },
  };
  return {
    tx,
    trip: { findUnique: jest.fn().mockResolvedValue(trip) },
    user: { findUnique: jest.fn().mockResolvedValue({ nombres: 'Jhon Lopez', username: '13959130' }) },
    $transaction: jest.fn(async (callback: any) => callback(tx)),
  };
}
