import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

const mockDepartmentService = {
  create: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('DepartmentController', () => {
  let controller: DepartmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentController],
      providers: [
        { provide: DepartmentService, useValue: mockDepartmentService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DepartmentController>(DepartmentController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('calls departmentService.create', async () => {
      mockDepartmentService.create.mockResolvedValue(undefined);
      const dto = { name: 'Engineering' };

      await controller.create(dto);

      expect(mockDepartmentService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('list', () => {
    it('returns paginated departments wrapped in data', async () => {
      const paginatedResult = { items: [], meta: { totalItems: 0 } };
      mockDepartmentService.list.mockResolvedValue(paginatedResult);
      const query = { page: 1, limit: 10 };

      const result = await controller.list(query);

      expect(mockDepartmentService.list).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: paginatedResult });
    });
  });

  describe('changeName', () => {
    it('calls departmentService.update with id and dto', async () => {
      mockDepartmentService.update.mockResolvedValue(undefined);
      const dto = { name: 'Marketing' };

      await controller.changeName(1, dto);

      expect(mockDepartmentService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('delete', () => {
    it('calls departmentService.delete with id', async () => {
      mockDepartmentService.delete.mockResolvedValue(undefined);

      await controller.delete(1);

      expect(mockDepartmentService.delete).toHaveBeenCalledWith(1);
    });
  });
});
