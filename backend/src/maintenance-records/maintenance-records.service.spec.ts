import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaintenanceRecordsService } from './maintenance-records.service';

describe('MaintenanceRecordsService', () => {
  const db = { bus: { findUnique: jest.fn() }, maintenanceRecord: { findMany: jest.fn(), create: jest.fn() }, assignment: { findFirst: jest.fn() } } as any;
  const service = new MaintenanceRecordsService(db);
  const adminActor = { id: 1, rol: 'ADMINISTRADOR' };
  beforeEach(() => jest.clearAllMocks());

  it('creates and lists multiple records for an area', async () => {
    db.bus.findUnique.mockResolvedValue({ id: 4 });
    db.maintenanceRecord.create.mockResolvedValue({ id: 1, area: 'MOTOR', cost: '120000.00' });
    db.maintenanceRecord.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    await service.create(4, { area: 'MOTOR' as any, cost: '120000.00', detail: 'Cambio de aceite' }, adminActor);
    expect(db.maintenanceRecord.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ busId: 4, area: 'MOTOR', detail: 'Cambio de aceite' }) }));
    await expect(service.list(4, 'MOTOR' as any)).resolves.toHaveLength(2);
    expect(db.maintenanceRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { busId: 4, area: 'MOTOR' } }));
  });

  it('rejects an invalid area and invalid cost', async () => {
    db.bus.findUnique.mockResolvedValue({ id: 4 });
    await expect(service.list(4, 'OTRA' as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create(4, { area: 'MOTOR' as any, cost: '12.345', detail: 'Detalle' }, adminActor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing bus', async () => {
    db.bus.findUnique.mockResolvedValue(null);
    await expect(service.list(99, 'MOTOR' as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.create(99, { area: 'MOTOR' as any, cost: '1000', detail: 'Detalle' }, adminActor)).rejects.toBeInstanceOf(NotFoundException);
  });
});
