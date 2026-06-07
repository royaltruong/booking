import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { paginate } from 'nestjs-typeorm-paginate';
import { UpdateDepartmentDto } from './dto/update-department.dto';

/** Handles CRUD operations for departments. */
@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  /**
   * Creates a new department.
   * @param createDepartmentDto - Department creation payload
   */
  async create(createDepartmentDto: CreateDepartmentDto): Promise<void> {
    await this.departmentRepository.save(
      this.departmentRepository.create(createDepartmentDto),
    );
  }

  /**
   * Finds a department by ID or throws if not found.
   * @param id - Department primary key
   * @returns The department entity
   * @throws {HttpException} 404 if department does not exist
   */
  async findOne(id: number): Promise<Department> {
    const department = await this.departmentRepository.findOneBy({ id });

    if (!department) {
      throw new HttpException('Department not found!', HttpStatus.NOT_FOUND);
    }

    return department;
  }

  /**
   * Updates the name of an existing department.
   * @param id - Department primary key
   * @param updateDepartmentDto - Fields to update
   * @throws {HttpException} 404 if department does not exist
   */
  async update(
    id: number,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<void> {
    const department = await this.departmentRepository.findOneBy({ id });

    if (!department) {
      throw new HttpException('Department not found!', HttpStatus.NOT_FOUND);
    }

    await this.departmentRepository.update({ id }, updateDepartmentDto);
  }

  /**
   * Returns a paginated list of departments.
   * @param departmentQueryDto - Pagination parameters (page, limit)
   */
  list(departmentQueryDto: DepartmentQueryDto) {
    return paginate<Department>(this.departmentRepository, departmentQueryDto);
  }

  /**
   * Permanently deletes a department by ID.
   * @param id - Department primary key
   * @throws {HttpException} 404 if department does not exist
   */
  async delete(id: number): Promise<void> {
    const department = await this.departmentRepository.findOneBy({ id });

    if (!department) {
      throw new HttpException('Department not found!', HttpStatus.NOT_FOUND);
    }

    await this.departmentRepository.delete(id);
  }
}
