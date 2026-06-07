import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsUnique } from '../../common/is-unique.constraint';
import { User } from '../../user/entities/user.entity';

export class RegisterDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUnique(User, 'username')
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  fullname: string;
}
