import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsUnique } from '../../common/is-unique.constraint';
import { Department } from '../entities/department.entity';
import { Transform } from 'class-transformer';

export class UpdateDepartmentDto {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  @IsUnique(Department, 'name')
  name: string;
}
