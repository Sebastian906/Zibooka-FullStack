import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const mockUserService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user and return success response', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '+1234567890',
      };

      const mockResult = {
        token: 'mockToken123',
        user: {
          email: 'john@example.com',
          name: 'John Doe',
        },
      };

      jest.spyOn(userService, 'register').mockResolvedValue(mockResult);

      await controller.register(registerDto, mockResponse as Response);

      expect(userService.register).toHaveBeenCalledWith(registerDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith('token', mockResult.token, expect.any(Object));
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        user: mockResult.user,
      });
    });
  });

  describe('login', () => {
    it('should login a user and return success response', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'password123',
        phone: '+1234567890',
      };

      const mockResult = {
        token: 'mockToken123',
        user: {
          email: 'john@example.com',
          name: 'John Doe',
        },
      };

      jest.spyOn(userService, 'login').mockResolvedValue(mockResult);

      await controller.login(loginDto, mockResponse as Response);

      expect(userService.login).toHaveBeenCalledWith(loginDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith('token', mockResult.token, expect.any(Object));
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        user: mockResult.user,
      });
    });
  });
});
