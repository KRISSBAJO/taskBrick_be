import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskDependencyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toTaskId!: string;

  @ApiPropertyOptional({ default: 'BLOCKS' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;
}
