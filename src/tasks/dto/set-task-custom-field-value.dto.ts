import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class SetTaskCustomFieldValueDto {
  @ApiProperty()
  @IsDefined()
  value!: unknown;
}
