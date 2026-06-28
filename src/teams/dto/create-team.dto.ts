import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Platform Team' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Owns backend platform services' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/taskbricks/image/upload/v1/team-avatar.png',
    nullable: true,
    type: String
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 'taskbricks/teams/platform-avatar', nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarPublicId?: string | null;
}
