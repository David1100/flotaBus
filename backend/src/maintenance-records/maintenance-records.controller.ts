import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../auth/csrf.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateMaintenanceRecordDto, MaintenanceArea } from './dto/maintenance-record.dto';
import { MaintenanceRecordsService } from './maintenance-records.service';

@Controller('maintenance-records')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Roles('ADMINISTRADOR')
export class MaintenanceRecordsController {
  constructor(private readonly service: MaintenanceRecordsService) {}

  @Get()
  list(@Query('busId', ParseIntPipe) busId: number, @Query('area') area: MaintenanceArea) {
    if (!Object.values(MaintenanceArea).includes(area)) throw new BadRequestException('Área de mantenimiento inválida.');
    return this.service.list(busId, area);
  }

  @Post('buses/:busId')
  create(@Param('busId', ParseIntPipe) busId: number, @Body() dto: CreateMaintenanceRecordDto) {
    return this.service.create(busId, dto);
  }
}
