import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DriversModule } from './drivers/drivers.module';
import { BusesModule } from './buses/buses.module';
import { TripsModule } from './trips/trips.module';
import { MaintenanceRecordsModule } from './maintenance-records/maintenance-records.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, DriversModule, BusesModule, TripsModule, MaintenanceRecordsModule],
  controllers: [HealthController],
})
export class AppModule {}
