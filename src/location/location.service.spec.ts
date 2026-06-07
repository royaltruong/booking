import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LocationService } from './location.service';
import { Location } from './entities/location.entity';
import { LocationSchedule } from './entities/location-schedule.entity';
import { DepartmentService } from '../department/department.service';
import { paginate } from 'nestjs-typeorm-paginate';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

jest.mock('nestjs-typeorm-paginate', () => ({ paginate: jest.fn() }));

const mockTreeRepository = {
  findAncestors: jest.fn(),
  findDescendants: jest.fn(),
};

const mockManager = {
  getTreeRepository: jest.fn().mockReturnValue(mockTreeRepository),
};

const mockLocationRepository = {
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  manager: mockManager,
};

const mockLocationScheduleRepository = {
  save: jest.fn(),
  find: jest.fn(),
};

const mockDepartmentService = {
  findOne: jest.fn(),
};

const mockDepartment = {
  id: 3,
  name: 'Engineering',
  employees: [],
  locations: [],
};

const mockSchedule = {
  id: 10,
  dayOfWeek: 1,
  openTime: '09:00:00',
  closeTime: '18:00:00',
  location: null as unknown as Location,
};

const mockLocation: Partial<Location> = {
  id: 1,
  name: 'Room A',
  capacity: 10,
  isRoom: true,
  isUsing: false,
  isActive: true,
  schedules: [mockSchedule],
  children: [],
  parent: null,
  department: mockDepartment,
};

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
        {
          provide: getRepositoryToken(LocationSchedule),
          useValue: mockLocationScheduleRepository,
        },
        { provide: DepartmentService, useValue: mockDepartmentService },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    jest.clearAllMocks();
    mockManager.getTreeRepository.mockReturnValue(mockTreeRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns location when found', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(mockLocation);

      const result = await service.findOne(1);

      expect(result).toBe(mockLocation);
      expect(mockLocationRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('returns null when location does not exist', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findOne(99);

      expect(result).toBeNull();
    });
  });

  describe('findAncestors', () => {
    it('returns null when location does not exist', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findAncestors(99);

      expect(result).toBeNull();
    });

    it('returns ancestors when location exists', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(mockLocation);
      const ancestors = [mockLocation, { id: 0, name: 'Root' }];
      mockTreeRepository.findAncestors.mockResolvedValue(ancestors);

      const result = await service.findAncestors(1);

      expect(result).toBe(ancestors);
      expect(mockTreeRepository.findAncestors).toHaveBeenCalledWith(
        mockLocation,
      );
    });
  });

  describe('create', () => {
    it('throws 422 when location name already exists under same parent', async () => {
      mockLocationRepository.findOneBy.mockResolvedValueOnce(mockLocation);

      await expect(
        service.create({
          name: 'Room A',
          capacity: 5,
          schedules: [],
        } as unknown as CreateLocationDto),
      ).rejects.toThrow(
        new HttpException(
          'Location name already exists',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('creates location without parent or department', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(null);
      mockLocationScheduleRepository.save.mockResolvedValue([]);
      mockLocationRepository.save.mockResolvedValue(mockLocation);

      await service.create({
        name: 'New Room',
        capacity: 5,
        schedules: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '17:00' }],
      } as unknown as CreateLocationDto);

      expect(mockLocationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Room', capacity: 5 }),
      );
    });

    it('filters out schedules that already have an id', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(null);
      mockLocationScheduleRepository.save.mockResolvedValue([]);
      mockLocationRepository.save.mockResolvedValue(mockLocation);

      const schedules = [
        { id: 10, dayOfWeek: 1, openTime: '09:00', closeTime: '17:00' },
        { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00' },
      ];

      await service.create({
        name: 'New Room',
        capacity: 5,
        schedules,
      } as unknown as CreateLocationDto);

      expect(mockLocationScheduleRepository.save).toHaveBeenCalledWith([
        { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00' },
      ]);
    });

    it('resolves parent and department when ids provided', async () => {
      const parentLocation = { id: 5, name: 'Floor 1' };
      mockLocationRepository.findOneBy
        .mockResolvedValueOnce(parentLocation)
        .mockResolvedValueOnce(null);
      mockLocationScheduleRepository.save.mockResolvedValue([]);
      mockDepartmentService.findOne.mockResolvedValue(mockDepartment);
      mockLocationRepository.save.mockResolvedValue(mockLocation);

      await service.create({
        name: 'New Room',
        capacity: 5,
        isRoom: false,
        parentId: 5,
        departmentId: 3,
        schedules: [],
      });

      expect(mockLocationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: parentLocation,
          department: mockDepartment,
        }),
      );
    });
  });

  describe('update', () => {
    it('throws 404 when location does not exist', async () => {
      mockLocationRepository.findOne.mockResolvedValue(null);

      await expect(service.update(99, { name: 'X' })).rejects.toThrow(
        new HttpException('Location not found!', HttpStatus.NOT_FOUND),
      );
    });

    it('updates basic fields and saves', async () => {
      const existingLocation = {
        ...mockLocation,
        schedules: [],
        department: null,
        parent: null,
      };
      mockLocationRepository.findOne.mockResolvedValue(existingLocation);
      mockLocationRepository.save.mockResolvedValue(existingLocation);

      await service.update(1, { name: 'Updated Room', capacity: 20 });

      expect(mockLocationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Room', capacity: 20 }),
      );
    });

    it('filters schedules from other locations on update', async () => {
      const existingLocation = { ...mockLocation, schedules: [], parent: null };
      const scheduleFromOther = { id: 99, location: { id: 999 } };
      const ownSchedule = { id: 10, location: { id: 1 } };

      mockLocationRepository.findOne.mockResolvedValue(existingLocation);
      mockLocationScheduleRepository.find.mockResolvedValue([
        scheduleFromOther,
        ownSchedule,
      ]);
      mockLocationScheduleRepository.save.mockResolvedValue([ownSchedule]);
      mockLocationRepository.save.mockResolvedValue(existingLocation);

      await service.update(1, {
        schedules: [{ id: 99 }, { id: 10 }],
      } as UpdateLocationDto);

      expect(mockLocationScheduleRepository.save).toHaveBeenCalledWith([
        { id: 10 },
      ]);
    });
  });

  describe('detail', () => {
    it('returns location detail with locationNumber for a root location', async () => {
      const detail = {
        id: 1,
        name: 'Room A',
        department: { name: 'Engineering' },
        schedules: [{ openTime: '09:00', closeTime: '17:00', dayOfWeek: 1 }],
      };
      const node = { id: 1, parent: null };
      mockLocationRepository.findOne.mockResolvedValue(detail);
      mockLocationRepository.findOneBy.mockResolvedValue(node);
      mockTreeRepository.findAncestors.mockResolvedValue([node]);

      const result = await service.detail(1);

      expect(result).toEqual({ ...detail, locationNumber: '1' });
    });

    it('returns location detail with locationNumber for a nested location', async () => {
      const detail = {
        id: 3,
        name: 'Room 101',
        department: { name: 'Engineering' },
        schedules: [],
      };
      const root = { id: 1, parent: null };
      const floor = { id: 2, parent: { id: 1 } };
      const node = { id: 3, parent: { id: 2 } };
      mockLocationRepository.findOne.mockResolvedValue(detail);
      mockLocationRepository.findOneBy.mockResolvedValue(node);
      mockTreeRepository.findAncestors.mockResolvedValue([root, floor, node]);

      const result = await service.detail(3);

      expect(result).toEqual({ ...detail, locationNumber: '1-2-3' });
    });

    it('returns null when location does not exist', async () => {
      mockLocationRepository.findOne.mockResolvedValue(null);

      const result = await service.detail(99);

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('calls paginate with correct options', async () => {
      const paginatedResult = {
        items: [mockLocation],
        meta: { totalItems: 1 },
      };
      (paginate as jest.Mock).mockResolvedValue(paginatedResult);
      const dto = { page: 1, limit: 10 };

      const result = await service.list(dto);

      expect(paginate).toHaveBeenCalledWith(
        mockLocationRepository,
        dto,
        expect.objectContaining({
          order: { schedules: { dayOfWeek: 'ASC' } },
        }),
      );
      expect(result).toBe(paginatedResult);
    });
  });

  describe('findDescendants', () => {
    it('returns null when location does not exist', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findDescendants(99);

      expect(result).toBeNull();
    });

    it('returns descendants when location exists', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(mockLocation);
      const descendants = [mockLocation, { id: 2, name: 'Child A' }];
      mockTreeRepository.findDescendants.mockResolvedValue(descendants);

      const result = await service.findDescendants(1);

      expect(result).toBe(descendants);
      expect(mockTreeRepository.findDescendants).toHaveBeenCalledWith(
        mockLocation,
      );
    });
  });

  describe('delete', () => {
    it('deletes location when found', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(mockLocation);
      mockLocationRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(1);

      expect(mockLocationRepository.delete).toHaveBeenCalledWith(1);
    });

    it('throws 404 when location does not exist', async () => {
      mockLocationRepository.findOneBy.mockResolvedValue(null);

      await expect(service.delete(99)).rejects.toThrow(
        new HttpException('Location not found!', HttpStatus.NOT_FOUND),
      );
    });
  });
});
