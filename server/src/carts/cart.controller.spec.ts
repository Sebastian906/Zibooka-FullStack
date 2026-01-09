import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { Response } from 'express';
import { UserService } from 'src/users/user.service';

describe('CartController', () => {
  let controller: CartController;
  let userService: UserService;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const mockUserService = {
      addToCart: jest.fn(),
      updateCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    userService = module.get<UserService>(UserService);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToCart', () => {
    it('should add item to cart successfully', async () => {
      const addToCartDto = {
        itemId: 'product123',
      };

      const mockResult = { message: 'Added to Cart' };

      jest.spyOn(userService, 'addToCart').mockResolvedValue(mockResult);

      await controller.addToCart(
        addToCartDto,
        'user123',
        mockResponse as Response,
      );

      expect(userService.addToCart).toHaveBeenCalledWith(
        'user123',
        addToCartDto,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
      });
    });
  });

  describe('updateCart', () => {
    it('should update cart successfully', async () => {
      const updateCartDto = {
        itemId: 'product123',
        quantity: 3,
      };

      const mockResult = { message: 'Cart Updated' };

      jest.spyOn(userService, 'updateCart').mockResolvedValue(mockResult);

      await controller.updateCart(
        updateCartDto,
        'user123',
        mockResponse as Response,
      );

      expect(userService.updateCart).toHaveBeenCalledWith(
        'user123',
        updateCartDto,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
      });
    });
  });
});