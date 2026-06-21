import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({ example: 'Lead' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string;
}
