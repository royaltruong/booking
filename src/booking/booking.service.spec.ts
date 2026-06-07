import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { Booking } from './entities/booking.entity';
import { Location } from '../location/entities/location.entity';
import { User } from '../user/entities/user.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

// June 8 2026 = Monday (dayOfWeek 1)
const MONDAY = new Date(2026, 5, 8, 10, 0, 0);
const MONDAY_RETURN = new Date(2026, 5, 8, 12, 0, 0);

const mockSchedule = {
  id: 10,
  dayOfWeek: 1,
  openTime: '09:00:00',
  closeTime: '18:00:00',
};

const mockDepartment = { id: 3, name: 'Engineering' };

const mockUser = {
  id: 1,
  username: 'alice',
  department: mockDepartment,
} as unknown as User;

const mockLocation = {
  id: 1,
  name: 'Room A',
  capacity: 10,
  isActive: true,
  isRoom: true,
  schedules: [mockSchedule],
  department: mockDepartment,
} as unknown as Location;

const mockBooking = {
  id: 1,
  name: 'Team Meeting',
  capacity: 5,
  bookingTime: MONDAY,
  returnTime: MONDAY_RETURN,
  isFinish: false,
  user: { ...mockUser },
  location: { ...mockLocation },
} as unknown as Booking;

const mockQueryBuilder = {
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getCount: jest.fn(),
};

const mockManager = {
  findOne: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockBookingRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

const txImpl = (...args: unknown[]) => {
  const cb =
    typeof args[0] === 'function'
      ? (args[0] as (m: typeof mockManager) => Promise<unknown>)
      : (args[1] as (m: typeof mockManager) => Promise<unknown>);
  return cb(mockManager);
};

const mockDataSource = {
  transaction: jest.fn().mockImplementation(txImpl),
  getRepository: jest.fn().mockReturnValue(mockBookingRepo),
};

const authInfo = { id: 1, username: 'alice' };

describe('BookingService', () => {
  let service: BookingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    jest.clearAllMocks();

    // Re-attach query builder chain after clearAllMocks
    mockManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.innerJoin.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockDataSource.transaction.mockImplementation(txImpl);
    mockDataSource.getRepository.mockReturnValue(mockBookingRepo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateBookingDto = {
      name: 'Team Meeting',
      capacity: 5,
      locationId: 1,
      bookingTime: MONDAY.toISOString(),
      returnTime: MONDAY_RETURN.toISOString(),
    };

    it('throws 404 when user not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.create(authInfo, dto)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
    });

    it('throws 404 when location not found or inactive', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      await expect(service.create(authInfo, dto)).rejects.toThrow(
        new HttpException('Location not found', HttpStatus.NOT_FOUND),
      );
    });

    it('throws 422 when location is not a room', async () => {
      const nonRoomLocation = { ...mockLocation, isRoom: false };
      mockManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(nonRoomLocation);

      await expect(service.create(authInfo, dto)).rejects.toThrow(
        new HttpException(
          'Location is not a room.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 403 when user department does not match location department', async () => {
      const userWithOtherDept = {
        ...mockUser,
        department: { id: 99, name: 'HR' },
      };
      mockManager.findOne
        .mockResolvedValueOnce(userWithOtherDept)
        .mockResolvedValueOnce(mockLocation);

      await expect(service.create(authInfo, dto)).rejects.toThrow(
        new HttpException(
          `Only users of the ${mockDepartment.name} department can book this location`,
          HttpStatus.FORBIDDEN,
        ),
      );
    });

    it('throws 403 when user has no department but location requires one', async () => {
      const userNoDept = { ...mockUser, department: null };
      mockManager.findOne
        .mockResolvedValueOnce(userNoDept)
        .mockResolvedValueOnce(mockLocation);

      await expect(service.create(authInfo, dto)).rejects.toThrow(
        new HttpException(
          `Only users of the ${mockDepartment.name} department can book this location`,
          HttpStatus.FORBIDDEN,
        ),
      );
    });

    it('throws 422 when booking capacity exceeds location capacity', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockLocation);

      await expect(
        service.create(authInfo, { ...dto, capacity: 20 }),
      ).rejects.toThrow(
        new HttpException(
          `Booking capacity (20) exceeds location capacity (${mockLocation.capacity})`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 422 when location has no schedule for the booking day', async () => {
      const locationNoSchedule = { ...mockLocation, schedules: [] };
      mockManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(locationNoSchedule);

      await expect(service.create(authInfo, dto)).rejects.toThrow(
        new HttpException(
          'Location is not open on this day',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 422 when booking time is outside opening hours', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockLocation);

      // 08:00 is before openTime 09:00:00
      const earlyDto = {
        ...dto,
        bookingTime: new Date(2026, 5, 8, 8, 0, 0).toISOString(),
        returnTime: new Date(2026, 5, 8, 10, 0, 0).toISOString(),
      };

      await expect(service.create(authInfo, earlyDto)).rejects.toThrow(
        new HttpException(
          `Booking must be within opening hours: ${mockSchedule.openTime} – ${mockSchedule.closeTime}`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 422 when return time exceeds closing time', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockLocation);

      const lateDto = {
        ...dto,
        bookingTime: new Date(2026, 5, 8, 10, 0, 0).toISOString(),
        returnTime: new Date(2026, 5, 8, 19, 0, 0).toISOString(),
      };

      await expect(service.create(authInfo, lateDto)).rejects.toThrow(
        new HttpException(
          `Booking must be within opening hours: ${mockSchedule.openTime} – ${mockSchedule.closeTime}`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 409 when location is already booked during that time', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockLocation);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      await expect(service.create(authInfo, dto)).rejects.toThrow(
        new HttpException(
          'Location is already booked during this time',
          HttpStatus.CONFLICT,
        ),
      );
    });

    it('creates and returns booking on success', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockLocation);
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockManager.create.mockReturnValue(mockBooking);
      mockManager.save.mockResolvedValue(mockBooking);

      const result = await service.create(authInfo, dto);

      expect(mockManager.create).toHaveBeenCalledWith(
        Booking,
        expect.objectContaining({ name: 'Team Meeting', capacity: 5 }),
      );
      expect(mockManager.save).toHaveBeenCalledWith(Booking, mockBooking);
      expect(result).toBe(mockBooking);
    });

    it('allows booking location with no department restriction', async () => {
      const locationNoDept = { ...mockLocation, department: null };
      const userNoDept = { ...mockUser, department: null };
      mockManager.findOne
        .mockResolvedValueOnce(userNoDept)
        .mockResolvedValueOnce(locationNoDept);
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockManager.create.mockReturnValue(mockBooking);
      mockManager.save.mockResolvedValue(mockBooking);

      const result = await service.create(authInfo, dto);

      expect(result).toBe(mockBooking);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // list
  // ──────────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns bookings for the authenticated user ordered by bookingTime DESC', async () => {
      const bookings = [mockBooking];
      mockBookingRepo.find.mockResolvedValue(bookings);

      const result = await service.list(authInfo);

      expect(mockBookingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: authInfo.id } },
          order: { bookingTime: 'DESC' },
        }),
      );
      expect(result).toBe(bookings);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update
  // ──────────────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws 404 when booking not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.update(authInfo, 99, { name: 'X' })).rejects.toThrow(
        new HttpException('Booking not found', HttpStatus.NOT_FOUND),
      );
    });

    it('throws 422 when booking is already finished', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        ...mockBooking,
        isFinish: true,
      });

      await expect(service.update(authInfo, 1, { name: 'X' })).rejects.toThrow(
        new HttpException(
          'Cannot update a finished booking',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 404 when new location does not exist', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(null);

      await expect(
        service.update(authInfo, 1, { locationId: 999 }),
      ).rejects.toThrow(
        new HttpException('Location not found', HttpStatus.NOT_FOUND),
      );
    });

    it('throws 422 when new location is not a room', async () => {
      const nonRoomLocation = { ...mockLocation, id: 2, isRoom: false };
      mockManager.findOne
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(nonRoomLocation);

      await expect(
        service.update(authInfo, 1, { locationId: 2 }),
      ).rejects.toThrow(
        new HttpException(
          'Location is not a room.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 403 when user department does not match new location department', async () => {
      const otherLocation = {
        ...mockLocation,
        id: 2,
        department: { id: 99, name: 'HR' },
      };
      mockManager.findOne
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(otherLocation);

      await expect(
        service.update(authInfo, 1, { locationId: 2 }),
      ).rejects.toThrow(
        new HttpException(
          `Only users of the HR department can book this location`,
          HttpStatus.FORBIDDEN,
        ),
      );
    });

    it('throws 422 when updated capacity exceeds location capacity', async () => {
      mockManager.findOne.mockResolvedValueOnce(mockBooking);

      await expect(
        service.update(authInfo, 1, { capacity: 99 }),
      ).rejects.toThrow(
        new HttpException(
          `Booking capacity (99) exceeds location capacity (${mockLocation.capacity})`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 422 when new bookingTime has no schedule for that day', async () => {
      // Tuesday June 9 has no schedule (only Monday is set)
      const tuesday = new Date(2026, 5, 9, 10, 0, 0);
      mockManager.findOne.mockResolvedValueOnce(mockBooking);

      await expect(
        service.update(authInfo, 1, {
          bookingTime: tuesday.toISOString(),
        }),
      ).rejects.toThrow(
        new HttpException(
          'Location is not open on this day',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 422 when updated time is outside opening hours', async () => {
      const earlyTime = new Date(2026, 5, 8, 7, 0, 0);
      mockManager.findOne.mockResolvedValueOnce(mockBooking);

      await expect(
        service.update(authInfo, 1, {
          bookingTime: earlyTime.toISOString(),
        }),
      ).rejects.toThrow(
        new HttpException(
          `Booking must be within opening hours: ${mockSchedule.openTime} – ${mockSchedule.closeTime}`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 409 when location is already booked during updated time', async () => {
      mockManager.findOne.mockResolvedValueOnce(mockBooking);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      await expect(
        service.update(authInfo, 1, {
          bookingTime: MONDAY.toISOString(),
          returnTime: MONDAY_RETURN.toISOString(),
        }),
      ).rejects.toThrow(
        new HttpException(
          'Location is already booked during this time',
          HttpStatus.CONFLICT,
        ),
      );
    });

    it('updates name only without time validation', async () => {
      const updatedBooking = { ...mockBooking, name: 'New Name' };
      mockManager.findOne.mockResolvedValueOnce({ ...mockBooking });
      mockManager.save.mockResolvedValue(updatedBooking);

      const result = await service.update(authInfo, 1, {
        name: 'New Name',
      });

      expect(mockManager.save).toHaveBeenCalledWith(
        Booking,
        expect.objectContaining({ name: 'New Name' }),
      );
      expect(result).toBe(updatedBooking);
    });

    it('updates time fields with overlap check and returns saved booking', async () => {
      mockManager.findOne.mockResolvedValueOnce({ ...mockBooking });
      mockQueryBuilder.getCount.mockResolvedValue(0);
      const savedBooking = { ...mockBooking };
      mockManager.save.mockResolvedValue(savedBooking);

      const result = await service.update(authInfo, 1, {
        bookingTime: MONDAY.toISOString(),
        returnTime: MONDAY_RETURN.toISOString(),
      });

      expect(result).toBe(savedBooking);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // checkin
  // ──────────────────────────────────────────────────────────────────────────

  describe('checkin', () => {
    const activeBooking = {
      ...mockBooking,
      bookingTime: new Date(2020, 0, 1),
      returnTime: new Date(2030, 0, 1),
      location: { ...mockLocation, isUsing: false },
    };

    it('throws 404 when booking not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.checkin(authInfo, 99)).rejects.toThrow(
        new HttpException('Booking not found', HttpStatus.NOT_FOUND),
      );
    });

    it('throws 422 when booking is already finished', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        ...activeBooking,
        isFinish: true,
      });

      await expect(service.checkin(authInfo, 1)).rejects.toThrow(
        new HttpException(
          'Booking is already finished',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 422 when now is before booking time', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        ...activeBooking,
        bookingTime: new Date(2030, 0, 1),
        returnTime: new Date(2031, 0, 1),
      });

      await expect(service.checkin(authInfo, 1)).rejects.toThrow(
        new HttpException(
          'Check-in is not allowed before the booking time',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 422 when booking has expired', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        ...activeBooking,
        bookingTime: new Date(2019, 0, 1),
        returnTime: new Date(2020, 0, 1),
      });

      await expect(service.checkin(authInfo, 1)).rejects.toThrow(
        new HttpException(
          'Booking has expired',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 409 when room is already in use', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        ...activeBooking,
        location: { ...mockLocation, isUsing: true },
      });

      await expect(service.checkin(authInfo, 1)).rejects.toThrow(
        new HttpException('Room is already in use', HttpStatus.CONFLICT),
      );
    });

    it('sets location.isUsing = true and returns success message', async () => {
      mockManager.findOne.mockResolvedValueOnce(activeBooking);
      mockManager.update.mockResolvedValue(undefined);

      const result = await service.checkin(authInfo, 1);

      expect(mockManager.update).toHaveBeenCalledWith(
        Location,
        mockLocation.id,
        {
          isUsing: true,
        },
      );
      expect(result).toEqual({ message: 'Check-in successful' });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // checkout
  // ──────────────────────────────────────────────────────────────────────────

  describe('checkout', () => {
    const checkedInBooking = {
      ...mockBooking,
      location: { ...mockLocation, isUsing: true },
    };

    it('throws 404 when booking not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.checkout(authInfo, 99)).rejects.toThrow(
        new HttpException('Booking not found', HttpStatus.NOT_FOUND),
      );
    });

    it('throws 422 when booking is already finished', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        ...checkedInBooking,
        isFinish: true,
      });

      await expect(service.checkout(authInfo, 1)).rejects.toThrow(
        new HttpException(
          'Booking is already finished',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('throws 422 when room is not currently in use', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        ...checkedInBooking,
        location: { ...mockLocation, isUsing: false },
      });

      await expect(service.checkout(authInfo, 1)).rejects.toThrow(
        new HttpException(
          'Room is not currently in use (check-in first)',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('frees room, finishes booking, and updates returnTime on success', async () => {
      mockManager.findOne.mockResolvedValueOnce(checkedInBooking);
      mockManager.update.mockResolvedValue(undefined);

      const result = await service.checkout(authInfo, 1);

      expect(mockManager.update).toHaveBeenCalledWith(
        Location,
        mockLocation.id,
        {
          isUsing: false,
        },
      );
      expect(mockManager.update).toHaveBeenCalledWith(
        Booking,
        checkedInBooking.id,
        {
          isFinish: true,
          returnTime: expect.any(Date) as jest.AsymmetricMatcher,
        },
      );
      expect(result).toEqual({ message: 'Check-out successful' });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // delete
  // ──────────────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws 404 when booking not found', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(service.delete(authInfo, 99)).rejects.toThrow(
        new HttpException('Booking not found', HttpStatus.NOT_FOUND),
      );
    });

    it('throws 422 when booking is already finished', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        ...mockBooking,
        isFinish: true,
      });

      await expect(service.delete(authInfo, 1)).rejects.toThrow(
        new HttpException(
          'Cannot delete a finished booking',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );
    });

    it('removes booking on success', async () => {
      mockBookingRepo.findOne.mockResolvedValue(mockBooking);
      mockBookingRepo.remove.mockResolvedValue(undefined);

      await service.delete(authInfo, 1);

      expect(mockBookingRepo.remove).toHaveBeenCalledWith(mockBooking);
    });
  });
});
