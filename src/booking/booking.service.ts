import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AuthInfo } from '../auth/strategy/jwt.strategy';
import { Booking } from './entities/booking.entity';
import { Location } from '../location/entities/location.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(authInfo: AuthInfo, dto: CreateBookingDto) {
    const bookingTime = new Date(dto.bookingTime);
    const returnTime = new Date(dto.returnTime);

    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: authInfo.id },
        relations: { department: true },
      });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const location = await manager.findOne(Location, {
        where: { id: dto.locationId, isActive: true },
        relations: { schedules: true, department: true },
      });
      if (!location)
        throw new HttpException('Location not found', HttpStatus.NOT_FOUND);

      if (!location.isRoom) {
        throw new HttpException(
          `Location is not a room.`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // Only users of the location's department may book it
      if (location.department) {
        if (!user.department || user.department.id !== location.department.id) {
          throw new HttpException(
            `Only users of the ${location.department.name} department can book this location`,
            HttpStatus.FORBIDDEN,
          );
        }
      }

      if (dto.capacity > location.capacity)
        throw new HttpException(
          `Booking capacity (${dto.capacity}) exceeds location capacity (${location.capacity})`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );

      // Verify the requested time window falls within opening hours
      const dayOfWeek = bookingTime.getDay();
      const schedule = location.schedules.find(
        (s) => s.dayOfWeek === dayOfWeek,
      );
      if (!schedule) {
        throw new HttpException(
          'Location is not open on this day',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const toTimeStr = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

      if (
        toTimeStr(bookingTime) < schedule.openTime ||
        toTimeStr(returnTime) > schedule.closeTime
      ) {
        throw new HttpException(
          `Booking must be within opening hours: ${schedule.openTime} – ${schedule.closeTime}`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // SERIALIZABLE isolation prevents phantom reads; this count catches same-tx conflicts
      const overlap = await manager
        .createQueryBuilder(Booking, 'b')
        .innerJoin('b.location', 'loc')
        .where('loc.id = :locationId', { locationId: dto.locationId })
        .andWhere('b.isFinish = :isFinish', { isFinish: false })
        .andWhere(
          'b.bookingTime < :returnTime AND b.returnTime > :bookingTime',
          { bookingTime, returnTime },
        )
        .getCount();

      if (overlap > 0) {
        throw new HttpException(
          'Location is already booked during this time',
          HttpStatus.CONFLICT,
        );
      }

      const booking = manager.create(Booking, {
        name: dto.name,
        capacity: dto.capacity,
        bookingTime,
        returnTime,
        isFinish: false,
        user,
        location,
      });

      return manager.save(Booking, booking);
    });
  }

  async list(authInfo: AuthInfo) {
    return this.dataSource.getRepository(Booking).find({
      where: { user: { id: authInfo.id } },
      relations: { location: true },
      order: { bookingTime: 'DESC' },
    });
  }

  async update(authInfo: AuthInfo, id: number, dto: UpdateBookingDto) {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const booking = await manager.findOne(Booking, {
        where: { id, user: { id: authInfo.id } },
        relations: {
          user: { department: true },
          location: { schedules: true, department: true },
        },
      });
      if (!booking)
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      if (booking.isFinish)
        throw new HttpException(
          'Cannot update a finished booking',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );

      if (dto.name !== undefined) booking.name = dto.name;

      const locationChanged =
        dto.locationId !== undefined && dto.locationId !== booking.location.id;
      if (locationChanged) {
        const location = await manager.findOne(Location, {
          where: { id: dto.locationId, isActive: true },
          relations: { schedules: true, department: true },
        });
        if (!location)
          throw new HttpException('Location not found', HttpStatus.NOT_FOUND);
        if (!location.isRoom)
          throw new HttpException(
            `Location is not a room.`,
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        if (location.department) {
          if (
            !booking.user.department ||
            booking.user.department.id !== location.department.id
          ) {
            throw new HttpException(
              `Only users of the ${location.department.name} department can book this location`,
              HttpStatus.FORBIDDEN,
            );
          }
        }
        booking.location = location;
      }

      if (dto.capacity !== undefined) {
        if (dto.capacity > booking.location.capacity)
          throw new HttpException(
            `Booking capacity (${dto.capacity}) exceeds location capacity (${booking.location.capacity})`,
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        booking.capacity = dto.capacity;
      }

      if (
        dto.bookingTime !== undefined ||
        dto.returnTime !== undefined ||
        locationChanged
      ) {
        const bookingTime = dto.bookingTime
          ? new Date(dto.bookingTime)
          : booking.bookingTime;
        const returnTime = dto.returnTime
          ? new Date(dto.returnTime)
          : booking.returnTime;

        const dayOfWeek = bookingTime.getDay();
        const schedule = booking.location.schedules.find(
          (s) => s.dayOfWeek === dayOfWeek,
        );
        if (!schedule)
          throw new HttpException(
            'Location is not open on this day',
            HttpStatus.UNPROCESSABLE_ENTITY,
          );

        const toTimeStr = (d: Date) =>
          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

        if (
          toTimeStr(bookingTime) < schedule.openTime ||
          toTimeStr(returnTime) > schedule.closeTime
        ) {
          throw new HttpException(
            `Booking must be within opening hours: ${schedule.openTime} – ${schedule.closeTime}`,
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }

        const overlap = await manager
          .createQueryBuilder(Booking, 'b')
          .innerJoin('b.location', 'loc')
          .where('loc.id = :locationId', { locationId: booking.location.id })
          .andWhere('b.id != :bookingId', { bookingId: id })
          .andWhere('b.isFinish = :isFinish', { isFinish: false })
          .andWhere(
            'b.bookingTime < :returnTime AND b.returnTime > :bookingTime',
            { bookingTime, returnTime },
          )
          .getCount();

        if (overlap > 0)
          throw new HttpException(
            'Location is already booked during this time',
            HttpStatus.CONFLICT,
          );

        booking.bookingTime = bookingTime;
        booking.returnTime = returnTime;
      }

      return manager.save(Booking, booking);
    });
  }

  async checkin(authInfo: AuthInfo, id: number) {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(Booking, {
        where: { id, user: { id: authInfo.id } },
        relations: { location: true },
      });
      if (!booking)
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      if (booking.isFinish)
        throw new HttpException(
          'Booking is already finished',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );

      const now = new Date();
      if (now < booking.bookingTime)
        throw new HttpException(
          'Check-in is not allowed before the booking time',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      if (now > booking.returnTime)
        throw new HttpException(
          'Booking has expired',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      if (booking.location.isUsing)
        throw new HttpException('Room is already in use', HttpStatus.CONFLICT);

      await manager.update(Location, booking.location.id, { isUsing: true });
      return { message: 'Check-in successful' };
    });
  }

  async checkout(authInfo: AuthInfo, id: number) {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(Booking, {
        where: { id, user: { id: authInfo.id } },
        relations: { location: true },
      });
      if (!booking)
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      if (booking.isFinish)
        throw new HttpException(
          'Booking is already finished',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      if (!booking.location.isUsing)
        throw new HttpException(
          'Room is not currently in use (check-in first)',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );

      const now = new Date();
      await manager.update(Location, booking.location.id, { isUsing: false });
      await manager.update(Booking, id, {
        isFinish: true,
        returnTime: now,
      });
      return { message: 'Check-out successful' };
    });
  }

  async delete(authInfo: AuthInfo, id: number) {
    const repo = this.dataSource.getRepository(Booking);
    const booking = await repo.findOne({
      where: { id, user: { id: authInfo.id } },
    });
    if (!booking)
      throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
    if (booking.isFinish)
      throw new HttpException(
        'Cannot delete a finished booking',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    await repo.remove(booking);
  }
}
