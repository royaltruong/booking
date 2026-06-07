import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockUserService = {
  createUser: jest.fn(),
  findOneByUsername: jest.fn(),
  profile: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('delegates to userService.createUser', async () => {
      const dto = {
        username: 'alice',
        password: 'secret',
        fullname: 'Alice Smith',
      };
      await service.register(dto);
      expect(mockUserService.createUser).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('throws 404 when username does not exist', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(null);
      await expect(
        service.login({ username: 'ghost', password: 'any' }),
      ).rejects.toThrow(
        new HttpException('Username does not exist', HttpStatus.NOT_FOUND),
      );
    });

    it('throws 401 when password is incorrect', async () => {
      mockUserService.findOneByUsername.mockResolvedValue({
        id: 1,
        username: 'alice',
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ username: 'alice', password: 'wrong' }),
      ).rejects.toThrow(
        new HttpException(
          'Username or password incorrect',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('returns access_token on valid credentials', async () => {
      mockUserService.findOneByUsername.mockResolvedValue({
        id: 1,
        username: 'alice',
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('jwt.access.token');

      const result = await service.login({
        username: 'alice',
        password: 'correct',
      });

      expect(result).toEqual({ access_token: 'jwt.access.token' });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 1,
        username: 'alice',
      });
    });
  });

  describe('profile', () => {
    it('delegates to userService.profile with username from authInfo', () => {
      const profileData = {
        id: 1,
        username: 'alice',
        fullname: 'Alice Smith',
        department: null,
      };
      mockUserService.profile.mockResolvedValue(profileData);

      void service.profile({ id: 1, username: 'alice' });

      expect(mockUserService.profile).toHaveBeenCalledWith('alice');
    });
  });
});
