import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                ADMIN_EMAIL: 'admin@test.com',
                ADMIN_PASS: 'admin123',
                ADMIN_PHONE: '+1234567890',
                JWT_SECRET: 'test-jwt-secret',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login admin with valid credentials', async () => {
      const loginDto = {
        email: 'admin@test.com',
        password: 'admin123',
        phone: '+1234567890',
      };

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('message', 'Admin logged in');
    });

    it('should throw UnauthorizedException with invalid email', async () => {
      const loginDto = {
        email: 'wrong@test.com',
        password: 'admin123',
        phone: '+1234567890',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const loginDto = {
        email: 'admin@test.com',
        password: 'wrongpassword',
        phone: '+1234567890',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with invalid phone', async () => {
      const loginDto = {
        email: 'admin@test.com',
        password: 'admin123',
        phone: '+9999999999',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyAdmin', () => {
    it('should verify valid admin email', async () => {
      const result = await service.verifyAdmin('admin@test.com');

      expect(result).toEqual({ email: 'admin@test.com' });
    });

    it('should throw UnauthorizedException with invalid admin email', async () => {
      await expect(service.verifyAdmin('invalid@test.com')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      const result = await service.logout();

      expect(result).toEqual({ message: 'Admin successfully logged out' });
    });
  });
});