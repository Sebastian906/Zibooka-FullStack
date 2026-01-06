import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard';
import * as jwt from 'jsonwebtoken';

describe('AdminAuthGuard', () => {
  let guard: AdminAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
      ],
    }).compile();

    guard = module.get<AdminAuthGuard>(AdminAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if no adminToken is provided', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          cookies: {},
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should allow access with valid admin token', async () => {
    const validToken = jwt.sign({ email: 'admin@test.com' }, 'test-jwt-secret');

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          cookies: { adminToken: validToken },
        }),
      }),
    } as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException with invalid token', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          cookies: { adminToken: 'invalid-token' },
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});