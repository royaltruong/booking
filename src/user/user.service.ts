import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserQueryDto } from './dto/user-query.dto';
import { paginate } from 'nestjs-typeorm-paginate';
import { DepartmentService } from '../department/department.service';
import { CreateUserDto } from './dto/create-user.dto';

/** Handles user management: creation, lookup, department assignment, and deletion. */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly departmentService: DepartmentService,
  ) {}

  /**
   * Creates a new user. Password is hashed automatically via the BeforeInsert hook.
   * @param createUserDto - Username and plain-text password
   */
  async createUser(createUserDto: CreateUserDto): Promise<void> {
    await this.usersRepository.save(this.usersRepository.create(createUserDto));
  }

  /**
   * Finds a user by ID or throws if not found.
   * @param id - User primary key
   * @returns The user entity
   * @throws {HttpException} 404 if no user with this ID exists
   */
  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });

    if (!user) {
      throw new HttpException('User not found!', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  /**
   * Finds a user by username. Returns null if not found.
   * @param username - The unique username to search
   */
  findOneByUsername(username: string) {
    return this.usersRepository.findOneBy({ username });
  }

  async findOneWithDepartment(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { department: true },
    });

    if (!user) {
      throw new HttpException('User not found!', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  /**
   * Returns a projected profile: id, username, fullname, department name.
   * @param username - The unique username
   */
  profile(username: string) {
    return this.usersRepository.findOne({
      select: {
        id: true,
        username: true,
        fullname: true,
        department: { name: true },
      },
      where: { username },
      relations: {
        department: true,
      },
    });
  }

  /**
   * Assigns a user to a department.
   * @param userId - Target user's primary key
   * @param departmentId - Target department's primary key
   * @throws {HttpException} 404 if user or department does not exist
   */
  async joinDepartment(userId: number, departmentId: number): Promise<void> {
    const user = await this.findOne(userId);
    const department = await this.departmentService.findOne(departmentId);
    await this.usersRepository.update({ id: user.id }, { department });
  }

  /**
   * Returns a paginated list of users with their department name.
   * @param userQueryDto - Pagination parameters (page, limit)
   */
  list(userQueryDto: UserQueryDto) {
    return paginate<User>(this.usersRepository, userQueryDto, {
      select: {
        id: true,
        username: true,
        fullname: true,
        department: { name: true },
      },
      relations: {
        department: true,
      },
    });
  }

  /**
   * Permanently deletes a user by ID.
   * @param id - User primary key
   * @throws {HttpException} 404 if user does not exist
   */
  async delete(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.delete(user.id);
  }
}
