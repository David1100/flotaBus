import 'reflect-metadata';
import { BusesController } from './buses.controller';

describe('BusesController authorization', () => {
  it('restricts every bus administration endpoint to administrators', () => {
    expect(Reflect.getMetadata('roles', BusesController)).toEqual(['ADMINISTRADOR']);
    expect(Reflect.getMetadata('roles', BusesController.prototype, 'update')).toBeUndefined();
  });
});
