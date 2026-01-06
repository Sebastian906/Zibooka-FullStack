import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let mockUserModel: any;
  let mockConfigService: any;

  const mockUser = {
    _id: 'mockUserId123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedPassword123',
    phone: '+1234567890',
    cartData: {},
    save: jest.fn().mockResolvedValue({
      _id: 'mockUserId123',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedPassword123',
      phone: '+1234567890',
    }),
  };

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      new: jest.fn().mockResolvedValue(mockUser),
      constructor: jest.fn().mockResolvedValue(mockUser),
      save: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '+1234567890',
      };

      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.prototype.save = jest.fn().mockResolvedValue(mockUser);

      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword123'));

      const result = await service.register(registerDto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: registerDto.email });
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.name).toBe(registerDto.name);
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '+1234567890',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: registerDto.email });
    });
  });

  describe('login', () => {
    it('should successfully login a user with valid credentials', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'password123',
        phone: '+1234567890',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await service.login(loginDto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: loginDto.email });
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
        phone: '+1234567890',
      };

      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: loginDto.email });
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto = {
        email: 'john@example.com',
        password: 'wrongpassword',
        phone: '+1234567890',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserById', () => {
    it('should return user data without password', async () => {
      const userId = 'mockUserId123';

      const mockUserWithoutPassword = {
        _id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      mockUserModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithoutPassword),
      });

      const result = await service.getUserById(userId);

      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        email: mockUserWithoutPassword.email,
        name: mockUserWithoutPassword.name,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'nonexistentId';

      mockUserModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getUserById(userId)).rejects.toThrow();
    });
  });
});
