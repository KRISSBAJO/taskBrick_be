import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

class BoardColumnOrderDto {
  @ApiProperty()
  @IsString()
  columnId!: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderBoardColumnsDto {
  @ApiProperty({ type: [BoardColumnOrderDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BoardColumnOrderDto)
  columns!: BoardColumnOrderDto[];
}
