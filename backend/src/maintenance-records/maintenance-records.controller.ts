import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CsrfGuard } from '../auth/csrf.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CloudinaryService, PHOTO_MAX_BYTES } from '../cloudinary/cloudinary.service';
import { CreateMaintenanceRecordDto, MaintenanceArea } from './dto/maintenance-record.dto';
import { MaintenanceRecordsService } from './maintenance-records.service';

@Controller('maintenance-records')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
export class MaintenanceRecordsController {
  constructor(private readonly service: MaintenanceRecordsService, private readonly cloudinary: CloudinaryService) {}

  @Get()
  @Roles('ADMINISTRADOR')
  list(@Query('busId', ParseIntPipe) busId: number, @Query('area') area: MaintenanceArea) {
    if (!Object.values(MaintenanceArea).includes(area)) throw new BadRequestException('Área de mantenimiento inválida.');
    return this.service.list(busId, area);
  }

  @Post('buses/:busId')
  @Roles('ADMINISTRADOR', 'CHOFER')
  create(@Param('busId', ParseIntPipe) busId: number, @Body() dto: CreateMaintenanceRecordDto, @Req() req: any) {
    return this.service.create(busId, dto, req.user);
  }

  @Post('buses/:busId/photo')
  @Roles('ADMINISTRADOR', 'CHOFER')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: PHOTO_MAX_BYTES }, fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) }))
  async uploadPhoto(@Param('busId', ParseIntPipe) busId: number, @UploadedFile() file: Express.Multer.File | undefined, @Req() req: any) {
    if (!file) throw new BadRequestException('Debes adjuntar la foto del mantenimiento.');
    if (req.user.rol === 'CHOFER') await this.service.assertDriverCanReport(busId, req.user.id);
    const photo = await this.cloudinary.upload(file, 'maintenance', busId);
    return { photoUrl: photo.photoUrl, photoPublicId: photo.photoPublicId };
  }
}
