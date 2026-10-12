import { IsInt, IsString, Length, Min } from 'class-validator';

export class SendMessageDto {
  @IsInt() @Min(1) recipientId!: number;
  @IsString() @Length(1, 2000) body!: string;
}
