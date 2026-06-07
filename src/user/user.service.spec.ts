import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { DepartmentService } from '../department/department.service';
import { paginate } from 'nestjs-typeorm-paginate';

jest.mock('nestjs-typeorm-paginate', () => ({ paginate: jest.fn() }));

const mockUsersRepository = {
  save: jest.fn(),
  create: jest.fn(),
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDepartmentService = {
  findOne: jest.fn(),
};

const mockUser = {
  id: 1,
  username: 'alice',
  password: 'hashed',
  fullname: 'Alice Smith',
  isActive: true,
  department: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  bookings: [],
} as unknown as User;

const mockDepartment = {
  id: 2,
  name: 'Engineering',
  employees: [],
  locations: [],
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: DepartmentService, useValue: mockDepartmentService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('creates and saves the user entity', async () => {
      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);

      await service.createUser({
        username: 'alice',
        password: 'secret',
      });

      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        username: 'alice',
        password: 'secret',
      });
      expect(mockUsersRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('findOne', () => {
    it('returns user when found', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).toBe(mockUser);
      expect(mockUsersRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('throws 404 when user does not exist', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new HttpException('User not found!', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('findOneByUsername', () => {
    it('returns user when found', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findOneByUsername('alice');

      expect(result).toBe(mockUser);
      expect(mockUsersRepository.findOneBy).toHaveBeenCalledWith({
        username: 'alice',
      });
    });

    it('returns null when user does not exist', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findOneByUsername('ghost');

      expect(result).toBeNull();
    });
  });

  describe('findOneWithDepartment', () => {
    it('returns user with department relation', async () => {
      const userWithDept = { ...mockUser, department: mockDepartment };
      mockUsersRepository.findOne.mockResolvedValue(userWithDept);

      const result = await service.findOneWithDepartment(1);

      expect(result).toBe(userWithDept);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { department: true },
      });
    });

    it('throws 404 when user does not exist', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneWithDepartment(99)).rejects.toThrow(
        new HttpException('User not found!', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('profile', () => {
    it('returns projected profile by username', async () => {
      const projected = {
        id: 1,
        username: 'alice',
        fullname: 'Alice Smith',
        department: { name: 'Engineering' },
      };
      mockUsersRepository.findOne.mockResolvedValue(projected);

      const result = await service.profile('alice');

      expect(result).toBe(projected);
    });
  });

  describe('joinDepartment', () => {
    it('assigns user to department', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(mockUser);
      mockDepartmentService.findOne.mockResolvedValue(mockDepartment);
      mockUsersRepository.update.mockResolvedValue({ affected: 1 });

      await service.joinDepartment(1, 2);

      expect(mockUsersRepository.update).toHaveBeenCalledWith(
        { id: 1 },
        { department: mockDepartment },
      );
    });

    it('throws 404 if user does not exist', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(service.joinDepartment(99, 2)).rejects.toThrow(
        new HttpException('User not found!', HttpStatus.NOT_FOUND),
      );
    });

    it('throws 404 if department does not exist', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(mockUser);
      mockDepartmentService.findOne.mockRejectedValue(
        new HttpException('Department not found!', HttpStatus.NOT_FOUND),
      );

      await expect(service.joinDepartment(1, 99)).rejects.toThrow(
        new HttpException('Department not found!', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('list', () => {
    it('calls paginate with correct options', async () => {
      const paginatedResult = { items: [mockUser], meta: { totalItems: 1 } };
      (paginate as jest.Mock).mockResolvedValue(paginatedResult);
      const dto = { page: 1, limit: 10 };

      const result = await service.list(dto);

      expect(paginate).toHaveBeenCalledWith(
        mockUsersRepository,
        dto,
        expect.objectContaining({ relations: { department: true } }),
      );
      expect(result).toBe(paginatedResult);
    });
  });

  describe('delete', () => {
    it('deletes user when found', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(mockUser);
      mockUsersRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(1);

      expect(mockUsersRepository.delete).toHaveBeenCalledWith(1);
    });

    it('throws 404 when user does not exist', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(service.delete(99)).rejects.toThrow(
        new HttpException('User not found!', HttpStatus.NOT_FOUND),
      );
    });
  });
});
