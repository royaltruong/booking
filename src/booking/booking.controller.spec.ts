import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { type AuthRequest } from '../auth/strategy/jwt.strategy';
import { type CreateBookingDto } from './dto/create-booking.dto';
import { type UpdateBookingDto } from './dto/update-booking.dto';

const mockBookingService = {
  create: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  checkin: jest.fn(),
  checkout: jest.fn(),
};

const authInfo = { id: 1, username: 'alice' };
const authRequest: AuthRequest = { user: authInfo };

const mockBooking = {
  id: 1,
  name: 'Team Meeting',
  capacity: 5,
  bookingTime: new Date(),
  returnTime: new Date(),
  isFinish: false,
};

describe('BookingController', () => {
  let controller: BookingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [{ provide: BookingService, useValue: mockBookingService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BookingController>(BookingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('passes request.user and dto to bookingService.create', () => {
      mockBookingService.create.mockResolvedValue(mockBooking);
      const dto: CreateBookingDto = {
        name: 'Team Meeting',
        capacity: 5,
        locationId: 1,
        bookingTime: '2026-06-08T10:00:00',
        returnTime: '2026-06-08T12:00:00',
      };

      void controller.create(authRequest, dto);

      expect(mockBookingService.create).toHaveBeenCalledWith(authInfo, dto);
    });
  });

  describe('list', () => {
    it('passes request.user to bookingService.list', () => {
      mockBookingService.list.mockResolvedValue([mockBooking]);

      void controller.list(authRequest);

      expect(mockBookingService.list).toHaveBeenCalledWith(authInfo);
    });
  });

  describe('update', () => {
    it('passes request.user, id, and dto to bookingService.update', () => {
      mockBookingService.update.mockResolvedValue(mockBooking);
      const dto: UpdateBookingDto = { name: 'Updated Name' };

      void controller.update(authRequest, 1, dto);

      expect(mockBookingService.update).toHaveBeenCalledWith(authInfo, 1, dto);
    });
  });

  describe('delete', () => {
    it('passes request.user and id to bookingService.delete', () => {
      mockBookingService.delete.mockResolvedValue(undefined);

      void controller.delete(authRequest, 1);

      expect(mockBookingService.delete).toHaveBeenCalledWith(authInfo, 1);
    });
  });

  describe('checkin', () => {
    it('passes request.user and id to bookingService.checkin', () => {
      mockBookingService.checkin.mockResolvedValue({
        message: 'Check-in successful',
      });

      void controller.checkin(authRequest, 1);

      expect(mockBookingService.checkin).toHaveBeenCalledWith(authInfo, 1);
    });
  });

  describe('checkout', () => {
    it('passes request.user and id to bookingService.checkout', () => {
      mockBookingService.checkout.mockResolvedValue({
        message: 'Check-out successful',
      });

      void controller.checkout(authRequest, 1);

      expect(mockBookingService.checkout).toHaveBeenCalledWith(authInfo, 1);
    });
  });
});
