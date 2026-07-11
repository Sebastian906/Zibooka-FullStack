import { Test, TestingModule } from '@nestjs/testing';
import { ReservationService } from './reservation.service';
import { getModelToken } from '@nestjs/mongoose';
import { PredictionClient } from '../prediction/prediction-client.service';
import { ProductService } from '../products/product.service';
import { BadRequestException } from '@nestjs/common';

// ObjectIds válidos de 24 chars hex para los tests
const BOOK_ID = '507f1f77bcf86cd799439011';
const USER_A = '507f1f77bcf86cd799439012';
const USER_B = '507f1f77bcf86cd799439013';
const USER_C = '507f1f77bcf86cd799439014';
const RES_1 = '507f1f77bcf86cd799439015';
const RES_2 = '507f1f77bcf86cd799439016';

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

  const mockLoanModel = {
    find: jest.fn(),
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        { provide: PredictionClient, useValue: mockPredictionClient },
        { provide: ProductService, useValue: mockProductService },
        { provide: getModelToken('Reservation'), useValue: mockReservationModel },
        { provide: getModelToken('Loan'), useValue: mockLoanModel },
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
      const mockProduct = { _id: BOOK_ID, inStock: false };
      const mockReservation = {
        _id: RES_1,
        userId: USER_A,
        bookId: BOOK_ID,
        priority: 1,
        status: 'pending',
        estimatedWaitDays: 7.5,
        requestDate: new Date(),
      };

      mockProductService.getSingleProduct.mockResolvedValue(mockProduct);
      mockReservationModel.findOne.mockResolvedValue(null);
      mockReservationModel.countDocuments.mockResolvedValue(0);
      mockReservationModel.create.mockResolvedValue(mockReservation);
      mockPredictionClient.estimateWaitTime.mockResolvedValue({
        estimated_days: 7.5,
        confidence: 'medium',
        confidence_interval: { lower: 2.5, upper: 12.5 },
      });

      const result = await service.addToWaitingList(USER_A, BOOK_ID);

      expect(result.estimatedWaitDays).toBe(7.5);
      expect(mockPredictionClient.estimateWaitTime).toHaveBeenCalledWith(BOOK_ID, 1);
    });

    it('should create reservation with null estimatedWaitDays when prediction fails', async () => {
      const mockProduct = { _id: BOOK_ID, inStock: false };
      const mockReservation = {
        _id: RES_1,
        userId: USER_A,
        bookId: BOOK_ID,
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

      const result = await service.addToWaitingList(USER_A, BOOK_ID);

      expect(result.estimatedWaitDays).toBeNull();
      expect(result.priority).toBe(1);
    });

    it('should throw when product is in stock', async () => {
      const mockProduct = { _id: BOOK_ID, inStock: true };
      mockProductService.getSingleProduct.mockResolvedValue(mockProduct);

      await expect(
        service.addToWaitingList(USER_A, BOOK_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when user already has pending reservation', async () => {
      const mockProduct = { _id: BOOK_ID, inStock: false };
      const existingReservation = { _id: 'existing', userId: USER_A, bookId: BOOK_ID };

      mockProductService.getSingleProduct.mockResolvedValue(mockProduct);
      mockReservationModel.findOne.mockResolvedValue(existingReservation);

      await expect(
        service.addToWaitingList(USER_A, BOOK_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it('should set priority based on queue size', async () => {
      const mockProduct = { _id: BOOK_ID, inStock: false };

      mockProductService.getSingleProduct.mockResolvedValue(mockProduct);
      mockReservationModel.findOne.mockResolvedValue(null);
      mockReservationModel.countDocuments.mockResolvedValue(3);
      mockReservationModel.create.mockImplementation((data) =>
        Promise.resolve({ ...data, _id: 'new' })
      );
      mockPredictionClient.estimateWaitTime.mockResolvedValue(null);

      await service.addToWaitingList(USER_A, BOOK_ID);

      expect(mockReservationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 4 })
      );
    });
  });

  describe('fulfillReservation', () => {
    it('should return null when no pending reservations exist', async () => {
      mockReservationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.fulfillReservation(BOOK_ID);

      expect(result).toBeNull();
    });

    it('should select user with best score (higher punctuality beats earlier position)', async () => {
      const mockPendingReservations = [
        {
          _id: RES_1,
          userId: { _id: USER_A, name: 'User A' },
          bookId: BOOK_ID,
          priority: 1,
          requestDate: new Date(Date.now() - 10 * 86400000),
          status: 'pending',
          save: jest.fn(),
        },
        {
          _id: RES_2,
          userId: { _id: USER_B, name: 'User B' },
          bookId: BOOK_ID,
          priority: 2,
          requestDate: new Date(Date.now() - 3 * 86400000),
          status: 'pending',
          save: jest.fn(),
        },
      ];

      mockReservationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPendingReservations),
      });

      mockLoanModel.aggregate.mockResolvedValue([
        {
          _id: USER_A,
          totalLoans: 10,
          puntualidadPromedio: 1.0,
          tasaDevTardias: 0,
        },
        {
          _id: USER_B,
          totalLoans: 5,
          puntualidadPromedio: 0.6,
          tasaDevTardias: 0.4,
        },
      ]);

      mockReservationModel.find
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockPendingReservations),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        });

      const result = await service.fulfillReservation(BOOK_ID);

      expect(result).toBeDefined();
      expect(result!._id).toBe(RES_1);
    });
  });

  describe('fulfillReservation - Scoring Compuesto', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should prefer user with good history over user with earlier position', async () => {
      // User A: llegó primero pero mal historial y poca espera
      // User B: llegó después pero historial perfecto y mucha espera
      const mockPending = [
        {
          _id: RES_1,
          userId: { _id: USER_A, name: 'A' },
          bookId: BOOK_ID,
          priority: 1,
          requestDate: new Date(Date.now() - 1 * 86400000),  // 1 día de espera
          status: 'pending',
          save: jest.fn(),
        },
        {
          _id: RES_2,
          userId: { _id: USER_B, name: 'B' },
          bookId: BOOK_ID,
          priority: 2,
          requestDate: new Date(Date.now() - 15 * 86400000), // 15 días de espera
          status: 'pending',
          save: jest.fn(),
        },
      ];

      mockReservationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPending),
      });

      // User A: 4 overdue de 5 préstamos (malo)
      // User B: 0 overdue de 10 préstamos (perfecto)
      mockLoanModel.aggregate.mockResolvedValue([
        { _id: USER_A, totalLoans: 5, puntualidadPromedio: 0.2, tasaDevTardias: 0.8 },
        { _id: USER_B, totalLoans: 10, puntualidadPromedio: 1.0, tasaDevTardias: 0.0 },
      ]);

      mockReservationModel.find
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockPending),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        });

      const result = await service.fulfillReservation(BOOK_ID);

      // Verificar cálculo manual:
      // Score A = 0.4*(1/1) + 0.3*0.2 + 0.2*(1/15) - 0.1*0.8 = 0.4 + 0.06 + 0.013 - 0.08 = 0.393
      // Score B = 0.4*(1/2) + 0.3*1.0 + 0.2*(15/15) - 0.1*0.0 = 0.2 + 0.3 + 0.2 = 0.7
      // B gana claramente
      expect(result!._id).toBe(RES_2);
    });

    it('should handle user with no loan history (neutral score)', async () => {
      const mockPending = [
        {
          _id: RES_1,
          userId: { _id: USER_A, name: 'New' },
          bookId: BOOK_ID,
          priority: 1,
          requestDate: new Date(Date.now() - 5 * 86400000),
          status: 'pending',
          save: jest.fn(),
        },
      ];

      mockReservationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPending),
      });

      mockLoanModel.aggregate.mockResolvedValue([]);

      mockReservationModel.find
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockPending),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        });

      const result = await service.fulfillReservation(BOOK_ID);

      expect(result).toBeDefined();
      expect(result!._id).toBe(RES_1);
    });

    it('should set fulfilledAt and notifiedAt on the winner', async () => {
      const mockPending = [
        {
          _id: RES_1,
          userId: { _id: USER_A, name: 'U' },
          bookId: BOOK_ID,
          priority: 1,
          requestDate: new Date(),
          status: 'pending',
          save: jest.fn(),
        },
      ];

      mockReservationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPending),
      });

      mockLoanModel.aggregate.mockResolvedValue([
        { _id: USER_A, totalLoans: 5, puntualidadPromedio: 0.8, tasaDevTardias: 0.2 },
      ]);

      mockReservationModel.find
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockPending),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        });

      const result = await service.fulfillReservation(BOOK_ID);

      expect(result!.status).toBe('fulfilled');
      expect(result!.fulfilledAt).toBeDefined();
      expect(result!.notifiedAt).toBeDefined();
      expect(mockPending[0].save).toHaveBeenCalled();
    });
  });
});