import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';

const file = (overrides: Partial<Express.Multer.File> = {}) => ({
  fieldname: 'photo', originalname: 'photo.jpg', encoding: '7bit', mimetype: 'image/jpeg', size: 10, destination: '', filename: '', path: '', buffer: Buffer.from('image'), stream: null as any, ...overrides,
} as Express.Multer.File);

describe('CloudinaryService', () => {
  it('rejects missing, non-image and oversized files before upload', () => {
    const service = new CloudinaryService(new ConfigService());
    expect(() => service.validate()).toThrow(BadRequestException);
    expect(() => service.validate(file({ mimetype: 'text/plain' }))).toThrow(BadRequestException);
    expect(() => service.validate(file({ size: 5 * 1024 * 1024 + 1 }))).toThrow(BadRequestException);
  });

  it('returns a controlled configuration error without credentials', async () => {
    const service = new CloudinaryService(new ConfigService());
    await expect(service.upload(file(), 'bus', 7)).rejects.toThrow(ServiceUnavailableException);
  });
});
