import { PartialType } from '@nestjs/swagger';
import { CreateProjectDecisionDto } from './create-project-decision.dto';

export class UpdateProjectDecisionDto extends PartialType(CreateProjectDecisionDto) {}
