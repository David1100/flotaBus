import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BusOperationalStatus } from '@prisma/client';

export class DashboardOverviewDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  busId?: number;

  @IsOptional()
  @IsEnum(BusOperationalStatus)
  status?: BusOperationalStatus;
}
