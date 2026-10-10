import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTripDto, UpdateTripDto } from './trip.dto';

describe('trip DTO contracts', () => {
  it('allows timezone when creating a trip', async () => {
    const errors = await validate(plainToInstance(CreateTripDto, {
      code: 'V-2026-001',
      origin: 'Bucaramanga',
      initialStartAt: '2026-10-10T22:00:00.000Z',
      timezone: 'America/Bogota',
      legs: [],
    }));

    expect(errors).toHaveLength(0);
  });

  it('does not allow timezone when updating a trip', async () => {
    const dto = plainToInstance(UpdateTripDto, {
      origin: 'Bucaramanga',
      initialStartAt: '2026-10-10T22:00:00.000Z',
      timezone: 'America/Bogota',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: 'timezone' }),
    ]));
  });
});
