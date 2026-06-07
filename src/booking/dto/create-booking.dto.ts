import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsPositive,
  Min,
} from 'class-validator';
import { IsFutureDate } from '../decorator/is-feature.validator';
import { IsAfterAndSameDay } from '../decorator/is-after-same-day.validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsPositive()
  locationId: number;

  @ApiProperty({ description: 'Number of attendees' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty()
  @IsDateString()
  @IsFutureDate()
  bookingTime: string;

  @ApiProperty()
  @IsDateString()
  @IsAfterAndSameDay('bookingTime')
  returnTime: string;
}
