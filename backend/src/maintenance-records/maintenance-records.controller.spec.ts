import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MaintenanceRecordsController } from './maintenance-records.controller';
import { MaintenanceRecordsService } from './maintenance-records.service';
import { RolesGuard } from '../auth/roles.guard';

describe('MaintenanceRecordsController', () => {
  it('requires the administrator role', () => {
    expect(Reflect.getMetadata('roles', MaintenanceRecordsController)).toEqual(['ADMINISTRADOR']);
    const guard = new RolesGuard(new Reflector());
    const context = { getHandler: () => MaintenanceRecordsController.prototype.list, getClass: () => MaintenanceRecordsController, switchToHttp: () => ({ getRequest: () => ({ user: { rol: 'CHOFER' } }) }) } as any;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('delegates creation to the service', async () => {
    const service = { create: jest.fn().mockResolvedValue({ id: 2 }) } as unknown as MaintenanceRecordsService;
    const controller = new MaintenanceRecordsController(service);
    await expect(controller.create(5, { area: 'CAJA' as any, cost: '50000', detail: 'Revisión' })).resolves.toEqual({ id: 2 });
    expect(service.create).toHaveBeenCalledWith(5, expect.objectContaining({ area: 'CAJA' }));
  });
});
