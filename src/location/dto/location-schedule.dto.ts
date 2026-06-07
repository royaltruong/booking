import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, Matches, ValidateIf } from 'class-validator';
import { IsBefore } from '../../common/is-before.validator';

export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

export class CreateLocationScheduleDto {
  @ApiProperty({
    enum: DayOfWeek,
    example: DayOfWeek.Monday,
    description:
      '0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday',
  })
  @IsEnum(DayOfWeek, {
    message: 'dayOfWeek must be between 0 and 6',
  })
  dayOfWeek: DayOfWeek;

  @ApiProperty()
  @Matches(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/, {
    message: '$property must be in H:mm or HH:mm format (e.g. 9:30 or 09:30)',
  })
  @IsBefore('closeTime', {
    message: 'openTime must be earlier than closeTime',
  })
  openTime: string;

  @ApiProperty()
  @Matches(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/, {
    message: '$property must be in H:mm or HH:mm format (e.g. 9:30 or 09:30)',
  })
  closeTime: string;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  id?: number;
}
