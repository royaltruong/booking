import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UserJoinDto {
  @ApiProperty()
  @IsNumber()
  departmentId: number;
}
