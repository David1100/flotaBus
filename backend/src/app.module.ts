import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DriversModule } from './drivers/drivers.module';
import { BusesModule } from './buses/buses.module';
import { TripsModule } from './trips/trips.module';
import { MaintenanceRecordsModule } from './maintenance-records/maintenance-records.module';
import { HealthController } from './health.controller';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CloudinaryModule, PrismaModule, AuthModule, DriversModule, BusesModule, TripsModule, MaintenanceRecordsModule, DashboardModule],
  controllers: [HealthController],
})
export class AppModule {}
