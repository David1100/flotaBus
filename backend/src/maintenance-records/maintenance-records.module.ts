import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceRecordsController } from './maintenance-records.controller';
import { MaintenanceRecordsService } from './maintenance-records.service';

@Module({ imports: [AuthModule, CloudinaryModule, NotificationsModule, PrismaModule], providers: [MaintenanceRecordsService], controllers: [MaintenanceRecordsController] })
export class MaintenanceRecordsModule {}
