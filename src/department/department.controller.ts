import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { Auth } from '../auth/decorator/auth.decorator';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Department controller')
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Create department' })
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    await this.departmentService.create(createDepartmentDto);
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Get department list' })
  async list(@Query() departmentQueryDto: DepartmentQueryDto) {
    const data = await this.departmentService.list(departmentQueryDto);
    return { data };
  }

  @Patch(':id')
  @Auth()
  @ApiOperation({ summary: 'Update department name' })
  async changeName(
    @Param('id') id: number,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    await this.departmentService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @Auth()
  @ApiOperation({ summary: 'Delete department' })
  async delete(@Param('id') id: number) {
    await this.departmentService.delete(id);
  }
}
