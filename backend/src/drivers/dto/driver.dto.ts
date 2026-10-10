import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

const USERNAME = /^[a-zA-Z0-9._-]+$/;
const PHONE = /^\+?[0-9 ()-]{7,24}$/;
const DRIVER_CODE = /^[A-Z0-9][A-Z0-9-]{2,19}$/;
// Código propio del conductor: permite identificarlo sin reutilizar username.
// Se normaliza a mayúsculas en el servicio y es único en PostgreSQL.

export class CreateDriverDto {
  @IsString() @IsNotEmpty() @Length(3, 20) @Matches(DRIVER_CODE) codigo!: string;
  @IsString() @IsNotEmpty() @Length(3, 64) @Matches(USERNAME) username!: string;
  @IsString() @IsNotEmpty() @Length(3, 120) nombres!: string;
  @IsString() @Matches(PHONE) telefono!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsOptional() @IsInt() @Min(1) defaultBusId?: number | null;
}

export class UpdateDriverDto {
  @IsString() @IsNotEmpty() @Length(3, 20) @Matches(DRIVER_CODE) codigo!: string;
  @IsString() @IsNotEmpty() @Length(3, 120) nombres!: string;
  @IsString() @Matches(PHONE) telefono!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @Length(8, 128) password?: string;
  @IsOptional() @IsInt() @Min(1) defaultBusId?: number | null;
}

export { UpdateDriverDto as DriverDto };
