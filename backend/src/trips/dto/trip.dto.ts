import { IsArray, IsDateString, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LegDto {
  @IsString() origin!: string;
  @IsString() destination!: string;
  @IsDateString() plannedDepartureAt!: string;
  @IsInt() @Min(1) durationDays!: number;
  @IsOptional() @IsString() notes?: string;
}
export class CreateTripDto {
  @IsString() code!: string;
  @IsString() origin!: string;
  @IsDateString() initialStartAt!: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LegDto) legs!: LegDto[];
}
export class UpdateTripDto {
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsDateString() initialStartAt?: string;
}
export class AssignmentDto { @IsInt() busId!: number; @IsInt() driverId!: number; }
export class EventDto {
  @IsString() type!: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() resumedAt?: string;
}
