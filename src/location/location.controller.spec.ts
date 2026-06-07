import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

const mockLocationService = {
  create: jest.fn(),
  list: jest.fn(),
  detail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAncestors: jest.fn(),
  findDescendants: jest.fn(),
};

describe('LocationController', () => {
  let controller: LocationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [{ provide: LocationService, useValue: mockLocationService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LocationController>(LocationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('calls locationService.create with dto', async () => {
      mockLocationService.create.mockResolvedValue(undefined);
      const dto = {
        name: 'Room A',
        capacity: 10,
        schedules: [],
      } as unknown as CreateLocationDto;

      await controller.create(dto);

      expect(mockLocationService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('list', () => {
    it('returns paginated locations wrapped in data', async () => {
      const paginatedResult = { items: [], meta: { totalItems: 0 } };
      mockLocationService.list.mockResolvedValue(paginatedResult);
      const query = { page: 1, limit: 10 };

      const result = await controller.list(query);

      expect(mockLocationService.list).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: paginatedResult });
    });
  });

  describe('detail', () => {
    it('returns location detail wrapped in data', async () => {
      const locationDetail = {
        id: 1,
        name: 'Room A',
        department: { name: 'Engineering' },
        schedules: [],
      };
      mockLocationService.detail.mockResolvedValue(locationDetail);

      const result = await controller.detail(1);

      expect(mockLocationService.detail).toHaveBeenCalledWith(1);
      expect(result).toEqual({ data: locationDetail });
    });
  });

  describe('update', () => {
    it('calls locationService.update with id and dto', async () => {
      mockLocationService.update.mockResolvedValue(undefined);
      const dto = { name: 'Updated Room' } as UpdateLocationDto;

      await controller.update(1, dto);

      expect(mockLocationService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('delete', () => {
    it('calls locationService.delete with id', async () => {
      mockLocationService.delete.mockResolvedValue(undefined);

      await controller.delete(1);

      expect(mockLocationService.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('findAncestors', () => {
    it('returns ancestors wrapped in data', async () => {
      const ancestors = [
        { id: 1, name: 'Building A' },
        { id: 2, name: 'Floor 1' },
        { id: 3, name: 'Room 101' },
      ];
      mockLocationService.findAncestors.mockResolvedValue(ancestors);

      const result = await controller.findAncestors(3);

      expect(mockLocationService.findAncestors).toHaveBeenCalledWith(3);
      expect(result).toEqual({ data: ancestors });
    });

    it('returns null wrapped in data when location not found', async () => {
      mockLocationService.findAncestors.mockResolvedValue(null);

      const result = await controller.findAncestors(99);

      expect(mockLocationService.findAncestors).toHaveBeenCalledWith(99);
      expect(result).toEqual({ data: null });
    });
  });

  describe('findDescendants', () => {
    it('returns descendants wrapped in data', async () => {
      const descendants = [
        { id: 2, name: 'Child A' },
        { id: 3, name: 'Child B' },
        { id: 1, name: 'Room A' },
      ];
      mockLocationService.findDescendants.mockResolvedValue(descendants);

      const result = await controller.findDescendants(1);

      expect(mockLocationService.findDescendants).toHaveBeenCalledWith(1);
      expect(result).toEqual({ data: descendants });
    });

    it('returns null wrapped in data when location not found', async () => {
      mockLocationService.findDescendants.mockResolvedValue(null);

      const result = await controller.findDescendants(99);

      expect(mockLocationService.findDescendants).toHaveBeenCalledWith(99);
      expect(result).toEqual({ data: null });
    });
  });
});
