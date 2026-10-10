import { IsEnum, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';

export enum MaintenanceArea {
  CAJA = 'CAJA',
  TRANSMISION = 'TRANSMISION',
  RETARDADOR = 'RETARDADOR',
  LLANTAS = 'LLANTAS',
  AIRE_ACONDICIONADO = 'AIRE_ACONDICIONADO',
  MOTOR = 'MOTOR',
}

export class CreateMaintenanceRecordDto {
  @IsEnum(MaintenanceArea) area!: MaintenanceArea;
  @IsString() @Matches(/^\d{1,12}(?:\.\d{1,2})?$/) cost!: string;
  @IsString() @Length(1, 2000) detail!: string;
  @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
}

export class MaintenanceHistoryQueryDto {
  @IsInt() @Min(1) busId!: number;
  @IsEnum(MaintenanceArea) area!: MaintenanceArea;
}
