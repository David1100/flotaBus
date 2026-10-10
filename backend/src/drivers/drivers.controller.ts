import { Body, Controller, Delete, Get, Param, Post, Patch, Query, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../auth/auth.guard'; import { RolesGuard } from '../auth/roles.guard'; import { CsrfGuard } from '../auth/csrf.guard'; import { Roles } from '../auth/roles.decorator';

@Controller('drivers') @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard) @Roles('ADMINISTRADOR')
export class DriversController {
  constructor(private service: DriversService) {}
  @Get() list(@Query('search') search = '', @Query('page') page = '1') { return this.service.list(search, Math.max(1, +page || 1)); }
  @Post() create(@Body() dto: CreateDriverDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDriverDto) { return this.service.update(+id, dto); }
  @Delete(':id') deactivate(@Param('id') id: string) { return this.service.deactivate(+id); }
}
