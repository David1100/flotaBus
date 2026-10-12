import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MaintenanceRecordsController } from './maintenance-records.controller';
import { MaintenanceRecordsService } from './maintenance-records.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RolesGuard } from '../auth/roles.guard';

describe('MaintenanceRecordsController', () => {
  it('requires the administrator role', () => {
    expect(Reflect.getMetadata('roles', MaintenanceRecordsController)).toBeUndefined();
    const listRoles = Reflect.getMetadata('roles', MaintenanceRecordsController.prototype.list);
    expect(listRoles).toEqual(['ADMINISTRADOR']);
    const guard = new RolesGuard(new Reflector());
    const context = { getHandler: () => MaintenanceRecordsController.prototype.list, getClass: () => MaintenanceRecordsController, switchToHttp: () => ({ getRequest: () => ({ user: { rol: 'CHOFER' } }) }) } as any;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('delegates creation to the service', async () => {
    const service = { create: jest.fn().mockResolvedValue({ id: 2 }) } as unknown as MaintenanceRecordsService;
    const cloudinary = {} as unknown as CloudinaryService;
    const controller = new MaintenanceRecordsController(service, cloudinary);
    await expect(controller.create(5, { category: 'MANTENIMIENTO' as any, area: 'CAJA' as any, cost: '50000', detail: 'Revisión' }, { user: { id: 1, rol: 'ADMINISTRADOR' } } as any)).resolves.toEqual({ id: 2 });
    expect(service.create).toHaveBeenCalledWith(5, expect.objectContaining({ category: 'MANTENIMIENTO', area: 'CAJA' }), expect.objectContaining({ id: 1, rol: 'ADMINISTRADOR' }));
  });
});
