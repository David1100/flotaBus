import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../auth/csrf.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BusesService } from './buses.service';
import { CreateBusDto, UpdateBusDto } from './dto/bus.dto';

@Controller('buses')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Roles('ADMINISTRADOR')
export class BusesController {
  constructor(private readonly service: BusesService) {}
  @Get() list(@Query('search') search = '', @Query('page') page = '1', @Query('limit') limit = '20') { return this.service.list(search, Number(page), Number(limit)); }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) { return this.service.get(id); }
  @Post() create(@Body() dto: CreateBusDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBusDto, @Req() req: any) { return this.service.update(id, dto, req.user); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
