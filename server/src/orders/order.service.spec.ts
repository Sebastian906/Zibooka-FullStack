import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from './schemas/order.schema';
import { Product } from 'src/products/schemas/product.schema';
import { User } from 'src/users/schemas/user.schema';

describe('OrderService', () => {
  let service: OrderService;
  let mockOrderModel: any;
  let mockProductModel: any;
  let mockUserModel: any;

  const mockProduct = {
    _id: 'product123',
    name: 'Test Product',
    offerPrice: 100,
  };

  const mockOrder = {
    _id: 'order123',
    userId: 'user123',
    items: [
      {
        product: 'product123',
        quantity: 2,
      },
    ],
    amount: 214, // (100 * 2) + (200 * 0.02) + 10
    address: 'address123',
    status: 'Order Placed',
    paymentMethod: 'COD',
    isPaid: false,
  };

  beforeEach(async () => {
    mockOrderModel = {
      create: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    mockProductModel = {
      findById: jest.fn(),
    };

    mockUserModel = {
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('placeOrderCOD', () => {
    it('should place an order successfully', async () => {
      const placeOrderDto = {
        items: [
          {
            product: 'product123',
            quantity: 2,
          },
        ],
        address: 'address123',
      };

      mockProductModel.findById.mockResolvedValue(mockProduct);
      mockOrderModel.create.mockResolvedValue(mockOrder);
      mockUserModel.findByIdAndUpdate.mockResolvedValue({});

      const result = await service.placeOrderCOD('user123', placeOrderDto);

      expect(mockProductModel.findById).toHaveBeenCalledWith('product123');
      expect(mockOrderModel.create).toHaveBeenCalled();
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
        cartData: {},
      });
      expect(result).toEqual({ message: 'Order Placed' });
    });
  });

  describe('userOrders', () => {
    it('should return user orders', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockResolvedValue([mockOrder]);

      mockOrderModel.find.mockReturnValue({
        populate: mockPopulate,
        sort: mockSort,
      });

      const result = await service.userOrders('user123');

      expect(mockOrderModel.find).toHaveBeenCalledWith({
        userId: 'user123',
        $or: [{ paymentMethod: 'COD' }, { isPaid: true }],
      });
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('allOrders', () => {
    it('should return all orders', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockResolvedValue([mockOrder]);

      mockOrderModel.find.mockReturnValue({
        populate: mockPopulate,
        sort: mockSort,
      });

      const result = await service.allOrders();

      expect(mockOrderModel.find).toHaveBeenCalledWith({
        $or: [{ paymentMethod: 'COD' }, { isPaid: true }],
      });
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      const updateDto = {
        orderId: 'order123',
        status: 'Shipped',
      };

      mockOrderModel.findByIdAndUpdate.mockResolvedValue({
        ...mockOrder,
        status: 'Shipped',
      });

      const result = await service.updateStatus(updateDto);

      expect(mockOrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'order123',
        { status: 'Shipped' },
        { new: true },
      );
      expect(result).toEqual({ message: 'Order status updated' });
    });
  });
});