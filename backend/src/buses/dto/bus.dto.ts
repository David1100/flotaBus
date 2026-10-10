import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export enum BusType {
  DOBLE_PISO = 'DOBLE_PISO',
  NORMAL = 'NORMAL',
}

export enum BusOperationalStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_ROUTE = 'OUT_OF_ROUTE',
  STOPPED = 'STOPPED',
  REFUELING = 'REFUELING',
  INCIDENT = 'INCIDENT',
}

export class CreateBusDto {
  @IsString() @Length(2, 16) placa!: string;
  @IsInt() @Min(0) @Max(2147483647) kilometraje!: number;
  @IsString() @Length(1, 80) modelo!: string;
  @IsString() @Length(1, 80) marca!: string;
  @IsOptional() @IsEnum(BusType) busType?: BusType = BusType.NORMAL;
}

export class UpdateBusDto {
  @IsOptional() @IsString() @Length(2, 16) placa?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) kilometraje?: number;
  @IsOptional() @IsString() @Length(1, 80) modelo?: string;
  @IsOptional() @IsString() @Length(1, 80) marca?: string;
  @IsOptional() @IsEnum(BusType) busType?: BusType;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsEnum(BusOperationalStatus) manualStatus?: BusOperationalStatus;
}
