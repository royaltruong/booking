import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { In, Repository } from 'typeorm';
import { LocationSchedule } from './entities/location-schedule.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { DepartmentService } from '../department/department.service';
import { Department } from '../department/entities/department.entity';
import { LocationQueryDto } from './dto/location-query.dto';
import { paginate } from 'nestjs-typeorm-paginate';
import { UpdateLocationDto } from './dto/update-location.dto';

/** Handles CRUD operations for locations, including tree hierarchy and schedule management. */
@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(LocationSchedule)
    private readonly locationScheduleRepository: Repository<LocationSchedule>,
    private readonly departmentService: DepartmentService,
  ) {}

  /**
   * Finds a location by ID. Returns null if not found.
   * @param id - Location primary key
   */
  findOne(id: number) {
    return this.locationRepository.findOneBy({ id });
  }

  /**
   * Returns all ancestors of a location in the closure-table tree.
   * @param id - Location primary key
   * @returns Array of ancestor Location entities, or null if location not found
   */
  async findAncestors(id: number) {
    const node = await this.locationRepository.findOneBy({ id });
    if (!node) {
      return null;
    }
    const ancestors = await this.locationRepository.manager
      .getTreeRepository(Location)
      .findAncestors(node);
    return ancestors;
  }

  /**
   * Returns all descendants of a location in the closure-table tree.
   * @param id - Location primary key
   * @returns Flat array of all descendant Location entities, or null if location not found
   */
  async findDescendants(id: number) {
    const node = await this.locationRepository.findOneBy({ id });
    if (!node) {
      return null;
    }
    return this.locationRepository.manager
      .getTreeRepository(Location)
      .findDescendants(node);
  }

  /**
   * Creates a new location with optional parent, department, and schedules.
   * Schedules that already have an ID are ignored on creation.
   * @param createLocationDto - Location creation payload
   * @throws {HttpException} 422 if a location with the same name already exists under the same parent
   */
  async create(createLocationDto: CreateLocationDto) {
    let parent: Location | null = null;

    if (createLocationDto.parentId) {
      parent = await this.findOne(createLocationDto.parentId);
    }

    const existingLocation = await this.locationRepository.findOneBy({
      name: createLocationDto.name,
      ...(createLocationDto.parentId
        ? { parent: { id: createLocationDto.parentId } }
        : {}),
    });
    if (existingLocation) {
      throw new HttpException(
        'Location name already exists',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    createLocationDto.schedules = createLocationDto.schedules.filter(
      (item) => !item.id,
    );
    const schedules = await this.locationScheduleRepository.save(
      createLocationDto.schedules,
    );

    let department: Department | null = null;
    if (createLocationDto.departmentId) {
      department = await this.departmentService.findOne(
        createLocationDto.departmentId,
      );
    }

    await this.locationRepository.save({
      name: createLocationDto.name,
      capacity: createLocationDto.capacity,
      schedules,
      ...(parent
        ? {
            parent,
          }
        : {}),
      ...(department ? { department } : {}),
    });
  }

  /**
   * Updates an existing location's fields, schedules, parent, and department.
   * Schedules belonging to other locations are silently ignored.
   * @param id - Location primary key
   * @param updateLocationDto - Partial update payload
   * @throws {HttpException} 404 if location does not exist
   */
  async update(id: number, updateLocationDto: UpdateLocationDto) {
    const location = await this.locationRepository.findOne({
      where: { id },
      relations: { department: true, schedules: true, parent: true },
    });

    if (!location) {
      throw new HttpException('Location not found!', HttpStatus.NOT_FOUND);
    }

    Object.assign(location, updateLocationDto);

    if (updateLocationDto.parentId) {
      location.parent = await this.findOne(updateLocationDto.parentId);
    }

    if (updateLocationDto.schedules) {
      const oldSchedule = updateLocationDto.schedules
        .filter((item) => item.id)
        .map((item) => item.id);

      const checkSchedule = await this.locationScheduleRepository.find({
        where: { id: In(oldSchedule) },
        relations: { location: true },
      });

      const scheduleOtherLocation = checkSchedule
        .filter((item) => item.location.id !== location.id)
        .map((item) => item.id);

      updateLocationDto.schedules = updateLocationDto.schedules.filter(
        (item) =>
          item.id === undefined ||
          (item.id && !scheduleOtherLocation.includes(item.id)),
      );

      location.schedules = await this.locationScheduleRepository.save(
        updateLocationDto.schedules,
      );
    }

    if (updateLocationDto.departmentId) {
      location.department = await this.departmentService.findOne(
        updateLocationDto.departmentId,
      );
    }

    await this.locationRepository.save(location);
  }

  /**
   * Returns the full detail of a location including department and schedules.
   * @param id - Location primary key
   * @returns Location with selected fields and locationNumber, or null if not found
   */
  async detail(id: number) {
    const location = await this.locationRepository.findOne({
      select: {
        id: true,
        name: true,
        isActive: true,
        isRoom: true,
        isUsing: true,
        department: { name: true },
        schedules: { openTime: true, closeTime: true, dayOfWeek: true },
      },
      where: { id },
      relations: {
        department: true,
        schedules: true,
      },
    });

    if (!location) return null;

    const locationNumber = await this.buildLocationNumber(id);
    return { ...location, locationNumber };
  }

  private async buildLocationNumber(id: number): Promise<string> {
    const node = await this.locationRepository.findOneBy({ id });
    if (!node) return String(id);

    const ancestors = await this.locationRepository.manager
      .getTreeRepository(Location)
      .findAncestors(node, { relations: ['parent'] });

    const map = new Map(ancestors.map((a) => [a.id, a]));
    const ids: number[] = [];
    let current: Location | undefined = map.get(id);

    while (current) {
      ids.unshift(current.id);
      const parentId = current.parent?.id;
      current = parentId != null ? map.get(parentId) : undefined;
    }

    return ids.join('-');
  }

  /**
   * Returns a paginated list of locations sorted by schedule day of week ascending.
   * @param locationQueryDto - Pagination parameters (page, limit)
   */
  list(locationQueryDto: LocationQueryDto) {
    return paginate<Location>(this.locationRepository, locationQueryDto, {
      select: {
        id: true,
        name: true,
        department: { name: true },
        schedules: { openTime: true, closeTime: true, dayOfWeek: true },
      },
      relations: {
        department: true,
        schedules: true,
      },
      order: {
        schedules: {
          dayOfWeek: 'ASC',
        },
      },
    });
  }

  /**
   * Permanently deletes a location by ID.
   * @param id - Location primary key
   * @throws {HttpException} 404 if location does not exist
   */
  async delete(id: number) {
    const location = await this.locationRepository.findOneBy({ id });

    if (!location) {
      throw new HttpException('Location not found!', HttpStatus.NOT_FOUND);
    }

    await this.locationRepository.delete(id);
  }
}
