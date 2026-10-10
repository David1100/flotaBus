import { Module } from '@nestjs/common'; import { TripsController } from './trips.controller'; import { TripsService } from './trips.service'; import { PrismaModule } from '../prisma/prisma.module'; import { AuthModule } from '../auth/auth.module';
@Module({ imports: [PrismaModule, AuthModule], controllers: [TripsController], providers: [TripsService] }) export class TripsModule {}
