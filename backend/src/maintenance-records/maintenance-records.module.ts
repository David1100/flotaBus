import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceRecordsController } from './maintenance-records.controller';
import { MaintenanceRecordsService } from './maintenance-records.service';

@Module({ imports: [AuthModule, CloudinaryModule, PrismaModule], providers: [MaintenanceRecordsService], controllers: [MaintenanceRecordsController] })
export class MaintenanceRecordsModule {}
