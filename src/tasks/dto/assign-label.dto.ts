import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignLabelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  labelId!: string;
}
