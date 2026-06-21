import { PartialType } from '@nestjs/swagger';
import { CreateProjectChangeRequestDto } from './create-project-change-request.dto';

export class UpdateProjectChangeRequestDto extends PartialType(CreateProjectChangeRequestDto) {}
