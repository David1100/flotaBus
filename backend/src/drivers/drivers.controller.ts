import { Body, Controller, Delete, Get, Param, Post, Patch, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../auth/auth.guard'; import { RolesGuard } from '../auth/roles.guard'; import { CsrfGuard } from '../auth/csrf.guard'; import { Roles } from '../auth/roles.decorator';
import { CloudinaryService, PHOTO_MAX_BYTES } from '../cloudinary/cloudinary.service';

@Controller('drivers') @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard) @Roles('ADMINISTRADOR')
export class DriversController {
  constructor(private service: DriversService, private cloudinary: CloudinaryService) {}
  @Get() list(@Query('search') search = '', @Query('page') page = '1') { return this.service.list(search, Math.max(1, +page || 1)); }
  @Post() create(@Body() dto: CreateDriverDto) { return this.service.create(dto); }
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: PHOTO_MAX_BYTES }, fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) }))
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    const current = await this.service.getPhoto(+id);
    const photo = await this.cloudinary.upload(file!, 'driver', +id);
    const updated = await this.service.setPhoto(+id, photo);
    if (current.photoPublicId && current.photoPublicId !== photo.photoPublicId) await this.cloudinary.remove(current.photoPublicId);
    return updated;
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDriverDto) { return this.service.update(+id, dto); }
  @Delete(':id') deactivate(@Param('id') id: string) { return this.service.deactivate(+id); }
}
