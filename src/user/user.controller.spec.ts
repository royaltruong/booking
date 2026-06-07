import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

const mockUserService = {
  list: jest.fn(),
  joinDepartment: jest.fn(),
  delete: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('returns paginated users wrapped in data', async () => {
      const paginatedResult = { items: [], meta: { totalItems: 0 } };
      mockUserService.list.mockResolvedValue(paginatedResult);
      const query = { page: 1, limit: 10 };

      const result = await controller.list(query);

      expect(mockUserService.list).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: paginatedResult });
    });
  });

  describe('joinDepartment', () => {
    it('calls userService.joinDepartment with id and departmentId', async () => {
      mockUserService.joinDepartment.mockResolvedValue(undefined);

      await controller.joinDepartment(1, { departmentId: 5 });

      expect(mockUserService.joinDepartment).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('delete', () => {
    it('calls userService.delete with id', async () => {
      mockUserService.delete.mockResolvedValue(undefined);

      await controller.delete(1);

      expect(mockUserService.delete).toHaveBeenCalledWith(1);
    });
  });
});
