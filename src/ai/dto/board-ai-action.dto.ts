import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class BoardAiApplyActionsDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiPropertyOptional({ description: 'Board scope used when the action plan was generated.' })
  @IsOptional()
  @IsString()
  boardId?: string;

  @ApiProperty({ type: [String], maxItems: 20 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  actionIds!: string[];
}
