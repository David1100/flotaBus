import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CsrfGuard } from '../auth/csrf.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BusesService } from './buses.service';
import { CreateBusDto, UpdateBusDto } from './dto/bus.dto';
import { CloudinaryService, PHOTO_MAX_BYTES } from '../cloudinary/cloudinary.service';

@Controller('buses')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Roles('ADMINISTRADOR')
export class BusesController {
  constructor(private readonly service: BusesService, private readonly cloudinary: CloudinaryService) {}
  @Get() list(@Query('search') search = '', @Query('page') page = '1', @Query('limit') limit = '20') { return this.service.list(search, Number(page), Number(limit)); }
  @Get('catalog') catalog() { return this.service.listAvailable(); }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) { return this.service.get(id); }
  @Get(':id/detail') detail(@Param('id', ParseIntPipe) id: number) { return this.service.getDetail(id); }
  @Post() create(@Body() dto: CreateBusDto) { return this.service.create(dto); }
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: PHOTO_MAX_BYTES }, fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) }))
  async uploadPhoto(@Param('id', ParseIntPipe) id: number, @UploadedFile() file?: Express.Multer.File) {
    const current = await this.service.getPhoto(id);
    const photo = await this.cloudinary.upload(file!, 'bus', id);
    const updated = await this.service.setPhoto(id, photo);
    if (current.photoPublicId && current.photoPublicId !== photo.photoPublicId) await this.cloudinary.remove(current.photoPublicId);
    return updated;
  }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBusDto, @Req() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
