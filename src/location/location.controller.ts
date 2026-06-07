import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationService } from './location.service';
import { LocationQueryDto } from './dto/location-query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Auth } from '../auth/decorator/auth.decorator';

@ApiTags('Location controller')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Create location' })
  async create(@Body() createLocationDto: CreateLocationDto) {
    await this.locationService.create(createLocationDto);
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Get location list' })
  async list(@Query() locationQueryDto: LocationQueryDto) {
    const data = await this.locationService.list(locationQueryDto);
    return { data };
  }

  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Get location info' })
  async detail(@Param('id') id: number) {
    const data = await this.locationService.detail(id);
    return { data };
  }

  @Get(':id/ancestors')
  @Auth()
  @ApiOperation({ summary: 'Get all ancestors of a location' })
  async findAncestors(@Param('id') id: number) {
    const data = await this.locationService.findAncestors(id);
    return { data };
  }

  @Get(':id/descendants')
  @Auth()
  @ApiOperation({ summary: 'Get all descendants of a location' })
  async findDescendants(@Param('id') id: number) {
    const data = await this.locationService.findDescendants(id);
    return { data };
  }

  @Put(':id')
  @Auth()
  @ApiOperation({ summary: 'Update location' })
  async update(
    @Param('id') id: number,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    await this.locationService.update(id, updateLocationDto);
  }

  @Delete(':id')
  @Auth()
  @ApiOperation({ summary: 'Delete location' })
  async delete(@Param('id') id: number) {
    await this.locationService.delete(id);
  }
}
