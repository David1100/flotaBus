import { validate } from 'class-validator';
import { BusType, CreateBusDto } from './bus.dto';

describe('CreateBusDto', () => {
  it('accepts a valid bus type', async () => {
    const dto = Object.assign(new CreateBusDto(), { placa: 'ABC-123', kilometraje: 0, marca: 'Volvo', modelo: 'B8R', busType: BusType.DOBLE_PISO });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects negative mileage and unsupported bus types', async () => {
    const dto = Object.assign(new CreateBusDto(), { placa: 'A', kilometraje: -1, marca: '', modelo: '', busType: 'ARTICULADO' });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['placa', 'kilometraje', 'marca', 'modelo', 'busType']));
  });
});
