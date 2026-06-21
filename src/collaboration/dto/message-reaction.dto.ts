import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class MessageReactionDto {
  @ApiProperty({ example: '👍' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  emoji!: string;
}
