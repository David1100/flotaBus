import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';

@Module({ imports: [AuthModule, PrismaModule], providers: [BusesService], controllers: [BusesController] })
export class BusesModule {}
