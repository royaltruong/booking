import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class PaginateDto {
  @ApiProperty()
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  limit: number;

  @ApiProperty()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  page: number;
}
