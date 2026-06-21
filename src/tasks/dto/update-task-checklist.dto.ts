import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateTaskChecklistDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;
}
