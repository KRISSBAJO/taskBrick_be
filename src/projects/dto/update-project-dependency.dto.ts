import { PartialType } from '@nestjs/swagger';
import { CreateProjectDependencyDto } from './create-project-dependency.dto';

export class UpdateProjectDependencyDto extends PartialType(CreateProjectDependencyDto) {}
