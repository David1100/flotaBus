import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DriverPortalController } from './driver-portal.controller';
import { DriverPortalService } from './driver-portal.service';

@Module({ imports: [AuthModule], controllers: [DriverPortalController], providers: [DriverPortalService] })
export class DriverPortalModule {}