import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Injectable()
export class CloudinaryService {
  private readonly configured: boolean;
  private readonly folder: string;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME') || config.get<string>('CLOUDINARY_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY') || config.get<string>('CLOUDINARY_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET') || config.get<string>('CLOUDINARY_SECRET');
    this.configured = Boolean(cloudName && apiKey && apiSecret);
    this.folder = (config.get<string>('CLOUDINARY_FOLDER') || 'flotabus').replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'flotabus';
    if (this.configured) cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  }

  validate(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Debes adjuntar una imagen en el campo photo.');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) throw new BadRequestException('El archivo debe ser una imagen JPG, PNG, WEBP o GIF.');
    if (file.size > PHOTO_MAX_BYTES) throw new BadRequestException('La imagen no puede superar 5 MB.');
  }

  private requireConfiguration() {
    if (!this.configured) throw new ServiceUnavailableException('Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el backend.');
  }

  async upload(file: Express.Multer.File, entity: 'bus' | 'driver' | 'maintenance', id: number) {
    this.validate(file);
    this.requireConfiguration();
    const publicId = `${this.folder}/${entity}/${id}`;
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', public_id: publicId, overwrite: true, invalidate: true, tags: [`flotabus:${entity}`] }, (error, uploaded) => error ? reject(error) : resolve(uploaded!));
      stream.end(file.buffer);
    }).catch(() => { throw new ServiceUnavailableException('No se pudo subir la imagen a Cloudinary. Inténtalo de nuevo.'); });
    return { photoUrl: result.secure_url, photoPublicId: result.public_id };
  }

  async remove(publicId?: string | null) {
    if (!publicId || !this.configured) return;
    try { await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true }); } catch { /* No bloquea el CRUD. */ }
  }
}
