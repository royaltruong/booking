import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingService } from './booking.service';
import { type AuthRequest } from '../auth/strategy/jwt.strategy';
import { Auth } from '../auth/decorator/auth.decorator';

@ApiTags('Booking controller')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Create booking' })
  create(
    @Req() request: AuthRequest,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingService.create(request.user, createBookingDto);
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Get booking list' })
  list(@Req() request: AuthRequest) {
    return this.bookingService.list(request.user);
  }

  @Put(':id')
  @Auth()
  @ApiOperation({ summary: 'Update booking' })
  update(
    @Req() request: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingService.update(request.user, id, updateBookingDto);
  }

  @Post(':id/checkin')
  @Auth()
  @ApiOperation({ summary: 'Check in to a booking (marks room as in use)' })
  checkin(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.checkin(request.user, id);
  }

  @Post(':id/checkout')
  @Auth()
  @ApiOperation({
    summary: 'Check out of a booking (frees the room and updates return time)',
  })
  checkout(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.checkout(request.user, id);
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete booking' })
  delete(@Req() request: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.delete(request.user, id);
  }
}
