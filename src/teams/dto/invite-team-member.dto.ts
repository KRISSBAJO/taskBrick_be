import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteTeamMemberDto {
  @ApiProperty({ example: 'member@acme.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Grace' })
  @IsString()
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Hopper' })
  @IsString()
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional({ example: 'Member' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  teamRole?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roleIds?: string[];
}
