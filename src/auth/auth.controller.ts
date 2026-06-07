import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { type AuthRequest } from './strategy/jwt.strategy';
import { Auth } from './decorator/auth.decorator';

@ApiTags('Auth controller')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register account' })
  async register(@Body() registerDto: RegisterDto) {
    await this.authService.register(registerDto);
    return { message: 'Register account success' };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login account' })
  async login(@Body() loginDto: LoginDto) {
    const data = await this.authService.login(loginDto);
    return { data };
  }

  @Get('profile')
  @Auth()
  @ApiOperation({ summary: 'Get profile' })
  async profile(@Req() request: AuthRequest) {
    const data = await this.authService.profile(request.user);
    return { data };
  }
}
