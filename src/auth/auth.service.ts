import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthInfo } from './strategy/jwt.strategy';

/** Handles authentication: registration, login, and profile retrieval. */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user account.
   * @param registerDto - Registration payload (username, password)
   */
  async register(registerDto: RegisterDto): Promise<void> {
    await this.userService.createUser(registerDto);
  }

  /**
   * Authenticates a user and returns a signed JWT access token.
   * @param loginDto - Login credentials
   * @returns Object containing the JWT access token
   * @throws {HttpException} 404 if username does not exist
   * @throws {HttpException} 401 if password is incorrect
   */
  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.userService.findOneByUsername(loginDto.username);
    if (!user) {
      throw new HttpException('Username does not exist', HttpStatus.NOT_FOUND);
    }
    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new HttpException(
        'Username or password incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  profile(authInfo: AuthInfo) {
    return this.userService.profile(authInfo.username);
  }
}
