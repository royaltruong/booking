import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { LocationModule } from '../location/location.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), UserModule, LocationModule],
  providers: [BookingService],
  controllers: [BookingController],
})
export class BookingModule {}
