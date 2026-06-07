import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateLocationScheduleDto } from './location-schedule.dto';
import { Type } from 'class-transformer';
import { UniqueDayOfWeekValidator } from '../../common/unique-date.validator';

export class CreateLocationDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @ValidateIf((o: CreateLocationDto) => o.isRoom === true)
  @IsPositive()
  capacity: number;

  @ApiProperty()
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isRoom: boolean;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  parentId: number;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  departmentId: number;

  @ApiProperty({
    type: [CreateLocationScheduleDto],
    description: 'Location schedules',
    maxItems: 7,
  })
  @IsArray()
  @ArrayMaxSize(7, {
    message: 'Schedule can contain at most 7 items',
  })
  @Validate(UniqueDayOfWeekValidator)
  @ValidateNested({ each: true })
  @Type(() => CreateLocationScheduleDto)
  schedules: CreateLocationScheduleDto[];
}
