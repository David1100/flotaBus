import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { BusesController } from '../buses/buses.controller';

describe('RolesGuard', () => {
  const handler = () => undefined;
  function context(role: string) {
    return {
      getHandler: () => handler,
      getClass: () => BusesController,
      switchToHttp: () => ({ getRequest: () => ({ user: { rol: role } }) }),
    } as any;
  }

  it('reads class metadata and allows an administrator', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMINISTRADOR']) } as any;

    expect(new RolesGuard(reflector).canActivate(context('ADMINISTRADOR'))).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [handler, BusesController]);
  });

  it('rejects a CHOFER before a buses endpoint can execute', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMINISTRADOR']) } as any;

    expect(() => new RolesGuard(reflector).canActivate(context('CHOFER'))).toThrow(ForbiddenException);
  });
});
