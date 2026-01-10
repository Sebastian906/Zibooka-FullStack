import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { getModelToken } from '@nestjs/mongoose';
import { Address } from './schemas/address.schema';

describe('AddressService', () => {
  let service: AddressService;
  let mockAddressModel: any;

  const mockAddress = {
    _id: 'address123',
    userId: 'user123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    zipcode: '10001',
    phone: '+1234567890',
  };

  beforeEach(async () => {
    mockAddressModel = {
      create: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        {
          provide: getModelToken(Address.name),
          useValue: mockAddressModel,
        },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addAddress', () => {
    it('should create an address successfully', async () => {
      const createAddressDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipcode: '10001',
        phone: '+1234567890',
      };

      mockAddressModel.create.mockResolvedValue(mockAddress);

      const result = await service.addAddress('user123', createAddressDto);

      expect(mockAddressModel.create).toHaveBeenCalledWith({
        ...createAddressDto,
        userId: 'user123',
      });
      expect(result).toEqual({ message: 'Address created successfully' });
    });
  });

  describe('getAddresses', () => {
    it('should return all addresses for a user', async () => {
      mockAddressModel.find.mockResolvedValue([mockAddress]);

      const result = await service.getAddresses('user123');

      expect(mockAddressModel.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(result).toEqual([mockAddress]);
    });
  });
});