import 'reflect-metadata';
import { BusesController } from './buses.controller';

describe('BusesController authorization', () => {
  const rolesOf = (method: keyof BusesController) => Reflect.getMetadata('roles', BusesController.prototype[method]);

  it('restricts fleet administration endpoints to administrators', () => {
    expect(rolesOf('list')).toEqual(['ADMINISTRADOR']);
    expect(rolesOf('create')).toEqual(['ADMINISTRADOR']);
    expect(rolesOf('uploadPhoto')).toEqual(['ADMINISTRADOR']);
    expect(rolesOf('update')).toEqual(['ADMINISTRADOR']);
    expect(rolesOf('remove')).toEqual(['ADMINISTRADOR']);
  });

  it('lets a driver read a bus and its ficha without admin rights', () => {
    expect(rolesOf('catalog')).toEqual(['ADMINISTRADOR', 'CHOFER']);
    expect(rolesOf('get')).toEqual(['ADMINISTRADOR', 'CHOFER']);
    expect(rolesOf('detail')).toEqual(['ADMINISTRADOR', 'CHOFER']);
  });
});
