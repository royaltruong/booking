import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DepartmentService } from './department.service';
import { Department } from './entities/department.entity';
import { paginate } from 'nestjs-typeorm-paginate';

jest.mock('nestjs-typeorm-paginate', () => ({ paginate: jest.fn() }));

const mockDepartmentRepository = {
  save: jest.fn(),
  create: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDepartment: Partial<Department> = {
  id: 1,
  name: 'Engineering',
  employees: [],
  locations: [],
};

describe('DepartmentService', () => {
  let service: DepartmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        {
          provide: getRepositoryToken(Department),
          useValue: mockDepartmentRepository,
        },
      ],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates and saves a new department', async () => {
      mockDepartmentRepository.create.mockReturnValue(mockDepartment);
      mockDepartmentRepository.save.mockResolvedValue(mockDepartment);

      await service.create({ name: 'Engineering' });

      expect(mockDepartmentRepository.create).toHaveBeenCalledWith({
        name: 'Engineering',
      });
      expect(mockDepartmentRepository.save).toHaveBeenCalledWith(
        mockDepartment,
      );
    });
  });

  describe('findOne', () => {
    it('returns department when found', async () => {
      mockDepartmentRepository.findOneBy.mockResolvedValue(mockDepartment);

      const result = await service.findOne(1);

      expect(result).toBe(mockDepartment);
      expect(mockDepartmentRepository.findOneBy).toHaveBeenCalledWith({
        id: 1,
      });
    });

    it('throws 404 when department does not exist', async () => {
      mockDepartmentRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new HttpException('Department not found!', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('update', () => {
    it('updates department name when found', async () => {
      mockDepartmentRepository.findOneBy.mockResolvedValue(mockDepartment);
      mockDepartmentRepository.update.mockResolvedValue({ affected: 1 });

      await service.update(1, { name: 'NewName' });

      expect(mockDepartmentRepository.update).toHaveBeenCalledWith(
        { id: 1 },
        { name: 'NewName' },
      );
    });

    it('throws 404 when department does not exist', async () => {
      mockDepartmentRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(99, { name: 'X' })).rejects.toThrow(
        new HttpException('Department not found!', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('list', () => {
    it('calls paginate and returns the result', async () => {
      const paginatedResult = {
        items: [mockDepartment],
        meta: { totalItems: 1 },
      };
      (paginate as jest.Mock).mockResolvedValue(paginatedResult);
      const dto = { page: 1, limit: 10 };

      const result = await service.list(dto);

      expect(paginate).toHaveBeenCalledWith(mockDepartmentRepository, dto);
      expect(result).toBe(paginatedResult);
    });
  });

  describe('delete', () => {
    it('deletes department when found', async () => {
      mockDepartmentRepository.findOneBy.mockResolvedValue(mockDepartment);
      mockDepartmentRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(1);

      expect(mockDepartmentRepository.delete).toHaveBeenCalledWith(1);
    });

    it('throws 404 when department does not exist', async () => {
      mockDepartmentRepository.findOneBy.mockResolvedValue(null);

      await expect(service.delete(99)).rejects.toThrow(
        new HttpException('Department not found!', HttpStatus.NOT_FOUND),
      );
    });
  });
});
