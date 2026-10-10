import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../auth/csrf.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @Roles('ADMINISTRADOR')
  overview(@Query() query: DashboardOverviewDto) {
    return this.service.overview(query);
  }
}
