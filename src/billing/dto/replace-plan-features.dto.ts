import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { PlanFeatureDto } from './plan-feature.dto';

export class ReplacePlanFeaturesDto {
  @ApiProperty({ type: [PlanFeatureDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureDto)
  features!: PlanFeatureDto[];
}
