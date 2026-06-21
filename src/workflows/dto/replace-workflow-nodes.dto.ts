import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { WorkflowNodeDto } from './workflow-node.dto';

export class ReplaceWorkflowNodesDto {
  @ApiProperty({ type: [WorkflowNodeDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes!: WorkflowNodeDto[];
}
