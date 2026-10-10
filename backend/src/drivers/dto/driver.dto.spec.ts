import { validate } from 'class-validator';
import { CreateDriverDto } from './driver.dto';

describe('CreateDriverDto', () => {
  it('accepts the documented code contract', async () => {
    const dto = Object.assign(new CreateDriverDto(), { codigo: 'COND-001', username: 'driver.one', nombres: 'Driver One', telefono: '+5215555555555', password: 'strong-pass' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('requires code, username and password', async () => {
    const errors = await validate(Object.assign(new CreateDriverDto(), { nombres: 'Driver', telefono: '1234567' }));
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['codigo', 'username', 'password']));
  });
});
