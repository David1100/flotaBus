import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../auth/csrf.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DriverPortalService } from './driver-portal.service';

@Controller('driver-portal')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Roles('CHOFER')
export class DriverPortalController {
  constructor(private readonly service: DriverPortalService) {}

  @Get('dashboard')
  dashboard(@Req() req: any) {
    return this.service.dashboard(req.user.id);
  }

  @Get('admins')
  admins() {
    return this.service.admins();
  }

  @Get('notifications')
  notifications(@Req() req: any) {
    return this.service.notifications(req.user.id);
  }

  @Get('trips/:id')
  tripDetail(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.tripDetail(req.user.id, id);
  }
}