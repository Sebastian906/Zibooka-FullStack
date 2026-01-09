import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

describe('ProductService', () => {
  let service: ProductService;
  let mockProductModel: any;

  const mockProduct = {
    _id: 'product123',
    name: 'Test Product',
    description: 'Test Description',
    price: 100,
    offerPrice: 80,
    image: ['url1', 'url2'],
    category: 'Electronics',
    popular: false,
    inStock: true,
  };

  beforeEach(async () => {
    mockProductModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          CLDN_NAME: 'test-cloud',
          CLDN_API_KEY: 'test-key',
          CLDN_API_SECRET: 'test-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listProducts', () => {
    it('should return all products', async () => {
      mockProductModel.find.mockResolvedValue([mockProduct]);

      const result = await service.listProducts();

      expect(mockProductModel.find).toHaveBeenCalled();
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('getSingleProduct', () => {
    it('should return a single product', async () => {
      mockProductModel.findById.mockResolvedValue(mockProduct);

      const result = await service.getSingleProduct('product123');

      expect(mockProductModel.findById).toHaveBeenCalledWith('product123');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductModel.findById.mockResolvedValue(null);

      await expect(service.getSingleProduct('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changeStock', () => {
    it('should update product stock successfully', async () => {
      const changeStockDto = {
        productId: 'product123',
        inStock: false,
      };

      mockProductModel.findByIdAndUpdate.mockResolvedValue({
        ...mockProduct,
        inStock: false,
      });

      const result = await service.changeStock(changeStockDto);

      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        { inStock: false },
        { new: true },
      );
      expect(result).toEqual({ message: 'Stock Updated' });
    });

    it('should throw NotFoundException if product not found', async () => {
      const changeStockDto = {
        productId: 'invalid-id',
        inStock: false,
      };

      mockProductModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.changeStock(changeStockDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});