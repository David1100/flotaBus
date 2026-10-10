import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../auth/csrf.guard'; import { JwtAuthGuard } from '../auth/auth.guard'; import { Roles } from '../auth/roles.decorator'; import { RolesGuard } from '../auth/roles.guard';
import { AssignmentDto, CreateTripDto, EventDto, LegDto, UpdateTripDto } from './dto/trip.dto'; import { TripsService } from './trips.service';
@Controller('trips') @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
export class TripsController {
  constructor(private service: TripsService) {}
  @Get() @Roles('ADMINISTRADOR','CHOFER') list(@Query('status') status: string | undefined, @Req() req: any) { return this.service.list(status, req.user); }
  @Get(':id') @Roles('ADMINISTRADOR','CHOFER') get(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.service.get(id, req.user); }
  @Get(':id/timeline') @Roles('ADMINISTRADOR','CHOFER') timeline(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.service.timeline(id, req.user); }
  @Post() @Roles('ADMINISTRADOR') create(@Body() dto: CreateTripDto, @Req() req: any) { return this.service.create(dto, req.user.id); }
  @Patch(':id') @Roles('ADMINISTRADOR') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTripDto) { return this.service.update(id, dto); }
  @Post(':id/legs') @Roles('ADMINISTRADOR') addLeg(@Param('id', ParseIntPipe) id: number, @Body() dto: LegDto) { return this.service.addLeg(id, dto); }
  @Patch(':id/legs/:legId') @Roles('ADMINISTRADOR') editLeg(@Param('id', ParseIntPipe) id: number, @Param('legId', ParseIntPipe) legId: number, @Body() dto: LegDto) { return this.service.editLeg(id, legId, dto); }
  @Delete(':id/legs/:legId') @Roles('ADMINISTRADOR') removeLeg(@Param('id', ParseIntPipe) id: number, @Param('legId', ParseIntPipe) legId: number) { return this.service.removeLeg(id, legId); }
  @Post(':id/assignments') @Roles('ADMINISTRADOR') assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignmentDto, @Req() req: any) { return this.service.assign(id, dto, req.user.id); }
  @Delete('assignments/:assignmentId') @Roles('ADMINISTRADOR') revoke(@Param('assignmentId', ParseIntPipe) assignmentId: number) { return this.service.revokeAssignment(assignmentId); }
  @Post(':id/events') @Roles('ADMINISTRADOR','CHOFER') event(@Param('id', ParseIntPipe) id: number, @Body() dto: EventDto, @Req() req: any) { return this.service.event(id, dto, req.user); }
  @Post(':id/cancel') @Roles('ADMINISTRADOR') cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: EventDto, @Req() req: any) { return this.service.cancel(id, req.user.id, dto.notes); }
}
