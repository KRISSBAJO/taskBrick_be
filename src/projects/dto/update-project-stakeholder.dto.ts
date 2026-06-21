import { PartialType } from '@nestjs/swagger';
import { CreateProjectStakeholderDto } from './create-project-stakeholder.dto';

export class UpdateProjectStakeholderDto extends PartialType(CreateProjectStakeholderDto) {}
