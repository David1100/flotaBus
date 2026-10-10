import { DriversService } from './drivers.service';

describe('DriversService', () => {
  it('normalizes code, hashes passwords, and never returns them', async () => {
    const db = { bus: { findFirst: jest.fn() }, user: { create: jest.fn().mockImplementation(async ({ data, select }: any) => {
      expect(data.codigo).toBe('COND-001');
      expect(data.passwordHash).not.toBe('strong-pass');
      expect(select.passwordHash).toBeUndefined();
      return { id: 1, codigo: data.codigo, username: data.username };
    }) } } as any;
    await expect(new DriversService(db).create({ codigo: 'cond-001', username: 'driver.one', nombres: 'Driver One', telefono: '1234567', password: 'strong-pass' } as any))
      .resolves.toEqual({ id: 1, codigo: 'COND-001', username: 'driver.one' });
  });

  it('validates and persists an active available default bus on create', async () => {
    const db = {
      bus: { findFirst: jest.fn().mockResolvedValue({ id: 7 }) },
      user: { create: jest.fn().mockResolvedValue({ id: 2, defaultBusId: 7, defaultBus: { id: 7, marca: 'Volvo', modelo: 'B8R', placa: 'ABC-123' } }) },
    } as any;
    const result = await new DriversService(db).create({ codigo: 'COND-002', username: 'driver.two', nombres: 'Driver Two', telefono: '1234567', password: 'strong-pass', defaultBusId: 7 } as any);
    expect(db.bus.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 7, isActive: true }) }));
    expect(db.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ defaultBusId: 7 }) }));
    expect(result.defaultBus).toEqual(expect.objectContaining({ id: 7, modelo: 'B8R' }));
  });

  it('updates the default bus and allows clearing it', async () => {
    const db = {
      bus: { findFirst: jest.fn().mockResolvedValue({ id: 8 }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 2, rol: 'CHOFER' }), update: jest.fn().mockResolvedValue({ id: 2, defaultBusId: null, defaultBus: null }) },
    } as any;
    const service = new DriversService(db);
    await service.update(2, { codigo: 'COND-002', nombres: 'Driver Two', telefono: '1234567', defaultBusId: 8 } as any);
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ defaultBusId: 8 }) }));
    await service.update(2, { codigo: 'COND-002', nombres: 'Driver Two', telefono: '1234567', defaultBusId: null } as any);
    expect(db.user.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ defaultBusId: null }) }));
  });

  it.each(['missing', 'inactive'])('rejects a %s default bus in Spanish', async () => {
    const db = { bus: { findFirst: jest.fn().mockResolvedValue(null) }, user: { create: jest.fn() } } as any;
    await expect(new DriversService(db).create({ codigo: 'COND-003', username: 'driver.three', nombres: 'Driver Three', telefono: '1234567', password: 'strong-pass', defaultBusId: 99 } as any)).rejects.toThrow('El bus por defecto no existe o no está activo y disponible.');
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('protects the administrator from deactivation', async () => {
    const db = { user: { findUnique: jest.fn().mockResolvedValue({ id: 1, rol: 'ADMINISTRADOR' }), update: jest.fn() } } as any;
    await expect(new DriversService(db).deactivate(1)).rejects.toThrow('Protected administrator');
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
