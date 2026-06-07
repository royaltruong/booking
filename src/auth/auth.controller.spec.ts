import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { type AuthRequest } from './strategy/jwt.strategy';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  profile: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('returns success message after registering', async () => {
      mockAuthService.register.mockResolvedValue(undefined);
      const dto = {
        username: 'alice',
        password: 'secret',
        fullname: 'Alice Smith',
      };

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'Register account success' });
    });
  });

  describe('login', () => {
    it('returns data wrapping the access_token', async () => {
      mockAuthService.login.mockResolvedValue({ access_token: 'tok123' });
      const dto = { username: 'alice', password: 'secret' };

      const result = await controller.login(dto);

      expect(result).toEqual({ data: { access_token: 'tok123' } });
    });
  });

  describe('profile', () => {
    it('returns data wrapping the profile', async () => {
      const profile = {
        id: 1,
        username: 'alice',
        fullname: 'Alice Smith',
        department: null,
      };
      mockAuthService.profile.mockResolvedValue(profile);
      const req: AuthRequest = { user: { id: 1, username: 'alice' } };

      const result = await controller.profile(req);

      expect(mockAuthService.profile).toHaveBeenCalledWith(req.user);
      expect(result).toEqual({ data: profile });
    });
  });
});
