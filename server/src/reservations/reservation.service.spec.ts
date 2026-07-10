import { Test, TestingModule } from '@nestjs/testing';
import { ReservationService } from './reservation.service';
import { getModelToken } from '@nestjs/mongoose';
import { PredictionClient } from '../prediction/prediction-client.service';
import { ProductService } from '../products/product.service';
import { BadRequestException } from '@nestjs/common';

describe('ReservationService', () => {
  let service: ReservationService;

  const mockPredictionClient = {
    estimateWaitTime: jest.fn(),
  };

  const mockProductService = {
    getSingleProduct: jest.fn(),
  };

  const mockReservationModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        { provide: PredictionClient, useValue: mockPredictionClient },
        { provide: ProductService, useValue: mockProductService },
        { provide: getModelToken('Reservation'), useValue: mockReservationModel },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToWaitingList', () => {
    it('should create reservation with estimatedWaitDays when prediction succeeds', async () => {
      const mockProduct = { _id: 'book1', inStock: false };
      const mockReservation = {
        _id: 'res1',
        userId: 'user1',
        bookId: 'book1',
        priority: 1,
        status: 'pending',
        estimatedWaitDays: 7.5,
        requestDate: new Date(),
      };

      mockProductService.getSingleProduct.mockResolvedValue(mockProduct);
      mockReservationModel.findOne.mockResolvedValue(null); // No duplicate
      mockReservationModel.countDocuments.mockResolvedValue(0); // Empty queue
      mockReservationModel.create.mockResolvedValue(mockReservation);
      mockPredictionClient.estimateWaitTime.mockResolvedValue({
        estimated_days: 7.5,
        confidence: 'medium',
        confidence_interval: { lower: 2.5, upper: 12.5 },
      });

      const result = await service.addToWaitingList('user1', 'book1');

      expect(result.estimatedWaitDays).toBe(7.5);
      expect(mockPredictionClient.estimateWaitTime).toHaveBeenCalledWith('book1', 1);
    });

    it('should create reservation with null estimatedWaitDays when prediction fails', async () => {
      const mockProduct = { _id: 'book1', inStock: false };
      const mockReservation = {
        _id: 'res1',
        userId: 'user1',
        bookId: 'book1',
        priority: 1,
        status: 'pending',
        estimatedWaitDays: null,
      };

      mockProductService.getSingleProduct.mockResolvedValue(mockProduct);
      mockReservationModel.findOne.mockResolvedValue(null);
      mockReservationModel.countDocuments.mockResolvedValue(0);
      mockReservationModel.create.mockResolvedValue(mockReservation);
      mockPredictionClient.estimateWaitTime.mockRejectedValue(
        new Error('ML service unavailable')
      );

      const result = await service.addToWaitingList('user1', 'book1');

      expect(result.estimatedWaitDays).toBeNull();
      expect(result.priority).toBe(1);
    });

    it('should throw when product is in stock', async () => {
      const mockProduct = { _id: 'book1', inStock: true };
      mockProductService.getSingleProduct.mockResolvedValue(mockProduct);

      await expect(
        service.addToWaitingList('user1', 'book1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when user already has pending reservation', async () => {
      const mockProduct = { _id: 'book1', inStock: false };
      const existingReservation = { _id: 'existing', userId: 'user1', bookId: 'book1' };

      mockProductService.getSingleProduct.mockResolvedValue(mockProduct);
      mockReservationModel.findOne.mockResolvedValue(existingReservation);

      await expect(
        service.addToWaitingList('user1', 'book1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should set priority based on queue size', async () => {
      const mockProduct = { _id: 'book1', inStock: false };

      mockProductService.getSingleProduct.mockResolvedValue(mockProduct);
      mockReservationModel.findOne.mockResolvedValue(null);
      mockReservationModel.countDocuments.mockResolvedValue(3); // 3 in queue
      mockReservationModel.create.mockImplementation((data) =>
        Promise.resolve({ ...data, _id: 'new' })
      );
      mockPredictionClient.estimateWaitTime.mockResolvedValue(null);

      await service.addToWaitingList('user1', 'book1');

      expect(mockReservationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 4 })
      );
    });
  });
});