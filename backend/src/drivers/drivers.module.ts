import { Module } from '@nestjs/common'; import { DriversService } from './drivers.service'; import { DriversController } from './drivers.controller'; import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], providers: [DriversService], controllers: [DriversController] }) export class DriversModule {}
