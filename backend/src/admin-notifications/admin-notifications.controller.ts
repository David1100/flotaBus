import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../auth/csrf.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminNotificationsService } from './admin-notifications.service';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Roles('ADMINISTRADOR')
export class AdminNotificationsController {
  constructor(private readonly service: AdminNotificationsService) {}

  @Get()
  async list(@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number, @Req() req: any): Promise<unknown> {
    return await this.service.list(req.user.id, Math.min(50, Math.max(1, limit)));
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markRead(req.user.id, id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.service.markAllRead(req.user.id);
  }
}