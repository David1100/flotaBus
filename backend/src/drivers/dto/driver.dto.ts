import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

const USERNAME = /^[a-zA-Z0-9._-]+$/;
const PHONE = /^\+?[0-9 ()-]{7,24}$/;

export class CreateDriverDto {
  @IsString() @IsNotEmpty() @Length(3, 64) @Matches(USERNAME) username!: string;
  @IsString() @IsNotEmpty() @Length(3, 120) nombres!: string;
  @IsString() @Matches(PHONE) telefono!: string;
  @IsString() @Length(8, 128) password!: string;
}

export class UpdateDriverDto {
  @IsString() @IsNotEmpty() @Length(3, 120) nombres!: string;
  @IsString() @Matches(PHONE) telefono!: string;
  @IsOptional() @IsString() @Length(8, 128) password?: string;
}

export { UpdateDriverDto as DriverDto };
