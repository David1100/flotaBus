import { ConflictException, NotFoundException } from '@nestjs/common';
import { BusesService } from './buses.service';

describe('BusesService', () => {
  const db = { bus: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() } } as any;
  const service = new BusesService(db);
  beforeEach(() => jest.clearAllMocks());

  it('returns only the newest active assignment on a non-terminal trip', async () => {
    const assignment = {
      id: 8,
      tripId: 12,
      assignedAt: new Date('2026-10-10T10:00:00.000Z'),
      trip: { id: 12, code: 'V-12', status: 'IN_TRANSIT' },
      driver: { id: 4, nombres: 'Ana Pérez', username: 'aperez' },
    };
    db.bus.findMany.mockResolvedValue([{ id: 1, placa: 'ABC-1', isActive: true, assignments: [assignment] }]);
    db.bus.count.mockResolvedValue(1);

    const result = await service.list();

    expect(db.bus.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        assignments: expect.objectContaining({
          where: { status: 'ACTIVE', trip: { status: { notIn: ['RETURNED', 'CANCELLED'] } } },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        }),
      }),
    }));
    expect(result.data[0]).toEqual(expect.objectContaining({
      status: 'IN_TRANSIT',
      currentAssignment: expect.objectContaining({ driver: assignment.driver, trip: assignment.trip }),
    }));
    expect(result.data[0]).not.toHaveProperty('assignments');
  });

  it('marks an active bus without a current assignment as available', async () => {
    db.bus.findMany.mockResolvedValue([{ id: 1, placa: 'ABC-1', isActive: true, manualStatus: null, assignments: [], defaultDrivers: [] }]);
    db.bus.count.mockResolvedValue(1);

    const result = await service.list();

    expect(result.data[0]).toEqual(expect.objectContaining({ status: 'AVAILABLE', currentAssignment: null, defaultDrivers: [] }));
  });

  it('returns an empty default driver collection without exposing user secrets', async () => {
    db.bus.findMany.mockResolvedValue([{ id: 1, placa: 'ABC-1', isActive: true, manualStatus: null, assignments: [], defaultDrivers: [] }]);
    db.bus.count.mockResolvedValue(1);

    const result = await service.list();

    expect(result.data[0].defaultDrivers).toEqual([]);
    expect(db.bus.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        defaultDrivers: expect.objectContaining({
          where: { rol: 'CHOFER' },
          select: { id: true, codigo: true, nombres: true, username: true, photoUrl: true },
        }),
      }),
    }));
  });

  it('returns multiple default drivers separately from the current assignment', async () => {
    const defaultDrivers = [
      { id: 2, codigo: 'COND-002', nombres: 'Ana Pérez', username: 'aperez', photoUrl: '/ana.jpg' },
      { id: 3, codigo: 'COND-003', nombres: 'Luis Gómez', username: 'lgomez', photoUrl: null },
    ];
    db.bus.findMany.mockResolvedValue([{ id: 1, placa: 'ABC-1', isActive: true, manualStatus: null, assignments: [], defaultDrivers }]);
    db.bus.count.mockResolvedValue(1);

    const result = await service.list();

    expect(result.data[0].defaultDrivers).toEqual(defaultDrivers);
    expect(result.data[0].currentAssignment).toBeNull();
    expect(result.data[0].defaultDrivers[0]).not.toHaveProperty('passwordHash');
  });

  it('normalizes plate and text before creating', async () => {
    db.bus.create.mockResolvedValue({ id: 1 });
    await service.create({ placa: ' abc-1 ', kilometraje: 4, marca: ' Volvo ', modelo: ' B8R ', busType: 'DOBLE_PISO' as any });
    expect(db.bus.create).toHaveBeenCalledWith({ data: expect.objectContaining({ placa: 'ABC-1', marca: 'Volvo', modelo: 'B8R', busType: 'DOBLE_PISO' }) });
  });

  it('translates duplicate plates into a safe conflict', async () => {
    db.bus.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create({ placa: 'ABC-1', kilometraje: 0, marca: 'Volvo', modelo: 'B8R' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found when updating a missing bus', async () => {
    db.bus.findUnique.mockResolvedValue(null);
    await expect(service.update(99, { marca: 'Volvo' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns only the identity fields needed by maintenance views', async () => {
    db.bus.findUnique.mockResolvedValue({ id: 2, placa: 'ABC123' });

    await expect(service.get(2)).resolves.toEqual({ id: 2, placa: 'ABC123' });
    expect(db.bus.findUnique).toHaveBeenCalledWith({ where: { id: 2 }, select: { id: true, placa: true } });
  });

  it('returns not found when resolving a missing bus identity', async () => {
    db.bus.findUnique.mockResolvedValue(null);

    await expect(service.get(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('persists a manual operational status with the administrator audit fields', async () => {
    db.bus.findUnique.mockResolvedValue({ id: 1, assignments: [] });
    db.bus.update.mockResolvedValue({ id: 1, manualStatus: 'MAINTENANCE' });

    await service.update(1, { manualStatus: 'MAINTENANCE' as any }, { id: 7, rol: 'ADMINISTRADOR' });

    expect(db.bus.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        manualStatus: 'MAINTENANCE',
        manualStatusUpdatedBy: { connect: { id: 7 } },
        manualStatusUpdatedAt: expect.any(Date),
      }),
    }));
  });

  it('rejects manual status changes while a non-terminal trip is active', async () => {
    db.bus.findUnique.mockResolvedValue({ id: 1, assignments: [{ trip: { status: 'IN_TRANSIT' } }] });

    await expect(service.update(1, { manualStatus: 'AVAILABLE' as any }, { id: 7, rol: 'ADMINISTRADOR' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(db.bus.update).not.toHaveBeenCalled();
  });

  it('rejects an available manual status when deactivating the bus', async () => {
    db.bus.findUnique.mockResolvedValue({ id: 1, assignments: [] });

    await expect(service.update(1, { manualStatus: 'AVAILABLE' as any, isActive: false }, { id: 7, rol: 'ADMINISTRADOR' }))
      .rejects.toThrow('Un bus inactivo no puede quedar Disponible.');
  });

  it('does not allow deactivating a bus with an active operational trip', async () => {
    db.bus.findUnique.mockResolvedValue({ id: 1, assignments: [{ trip: { status: 'ASSIGNED' } }] });

    await expect(service.update(1, { isActive: false }, { id: 7, rol: 'ADMINISTRADOR' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
