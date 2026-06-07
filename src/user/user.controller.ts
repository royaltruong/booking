import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { Auth } from '../auth/decorator/auth.decorator';
import { UserQueryDto } from './dto/user-query.dto';
import { UserJoinDto } from './dto/user-join.dto';

@ApiTags('User controller')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Get users' })
  async list(@Query() userQueryDto: UserQueryDto) {
    const data = await this.userService.list(userQueryDto);
    return { data };
  }

  @Patch(':id/join')
  @Auth()
  @ApiOperation({ summary: 'Join department' })
  async joinDepartment(
    @Param('id') id: number,
    @Body() userJoinDto: UserJoinDto,
  ) {
    await this.userService.joinDepartment(id, userJoinDto.departmentId);
  }

  @Delete(':id')
  @Auth()
  @ApiOperation({ summary: 'Delete user' })
  async delete(@Param('id') id: number) {
    await this.userService.delete(id);
  }
}
