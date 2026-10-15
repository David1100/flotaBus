import { BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

const emptyDb = () => ({
  bus: { findMany: jest.fn().mockResolvedValue([]) },
  maintenanceRecord: {
    aggregate: jest.fn().mockResolvedValue({ _sum: { cost: null }, _count: { _all: 0 } }),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  trip: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  user: { count: jest.fn().mockResolvedValue(0) },
});

describe('DashboardService', () => {
  it('returns a stable empty overview without null collections', async () => {
    const result = await new DashboardService(emptyDb() as any).overview({});

    expect(result.kpis).toMatchObject({ totalBuses: 0, availableBuses: 0, activeTrips: 0, maintenanceCost: 0 });
    expect(result.maintenanceByBus).toEqual([]);
    expect(result.busesInMaintenance).toEqual([]);
    expect(result.activeTrips).toEqual([]);
    expect(result.unassignedBuses).toEqual([]);
    expect(result.period.defaulted).toBe(true);
  });

  it('applies date, bus and status filters to the aggregate queries', async () => {
    const db = emptyDb();
    await new DashboardService(db as any).overview({ from: '2026-10-01', to: '2026-10-10', busId: 7, status: 'MAINTENANCE' as any });

    expect(db.maintenanceRecord.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ busId: 7 }) }));
    expect(db.maintenanceRecord.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ busId: 7 }) }));
    expect(db.bus.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 7, isActive: true }) }));
    expect(db.trip.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ initialStartAt: expect.any(Object) }) }));
  });

  it('aggregates maintenance costs and operational statuses in one response', async () => {
    const db = emptyDb();
    db.bus.findMany.mockResolvedValue([
      { id: 1, placa: 'ABC123', marca: 'Volvo', modelo: '2020', manualStatus: null, assignments: [], defaultDrivers: [] },
      { id: 2, placa: 'XYZ987', marca: 'Scania', modelo: '2021', manualStatus: 'MAINTENANCE', assignments: [], defaultDrivers: [] },
    ]);
    db.maintenanceRecord.aggregate.mockResolvedValue({ _sum: { cost: 250000 }, _count: { _all: 2 } });
    db.maintenanceRecord.groupBy.mockResolvedValue([{ busId: 2, _sum: { cost: 250000 }, _count: { _all: 2 } }]);
    const result = await new DashboardService(db as any).overview({});

    expect(result.kpis).toMatchObject({ totalBuses: 2, availableBuses: 1, maintenanceBuses: 1, maintenanceCost: 250000, maintenanceRecords: 2 });
    expect(result.maintenanceByBus).toEqual([{ busId: 2, placa: 'XYZ987', total: 250000, records: 2 }]);
    expect(result.busesInMaintenance).toHaveLength(1);
  });

  it('aggregates maintenance spend by category for the dashboard chart', async () => {
    const db = emptyDb();
    db.bus.findMany.mockResolvedValue([
      { id: 1, placa: 'ABC123', marca: 'Volvo', modelo: '2020', manualStatus: null, assignments: [], defaultDrivers: [] },
    ]);
    db.maintenanceRecord.groupBy
      .mockResolvedValueOnce([{ busId: 1, _sum: { cost: 300000 }, _count: { _all: 3 } }])
      .mockResolvedValueOnce([
        { category: 'MANTENIMIENTO', busId: 1, _sum: { cost: 200000 }, _count: { _all: 2 } },
        { category: 'COMBUSTIBLE', busId: 1, _sum: { cost: 100000 }, _count: { _all: 1 } },
      ]);
    const result = await new DashboardService(db as any).overview({});

    expect(result.maintenanceByCategory).toEqual([
      { category: 'MANTENIMIENTO', total: 200000, records: 2 },
      { category: 'COMBUSTIBLE', total: 100000, records: 1 },
    ]);
  });

  it('rejects an inverted period', async () => {
    await expect(new DashboardService(emptyDb() as any).overview({ from: '2026-10-10', to: '2026-10-01' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
