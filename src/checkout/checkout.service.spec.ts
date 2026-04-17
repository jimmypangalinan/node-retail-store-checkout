import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import { ICheckoutRepository } from './repositories';
import { IOrdersService } from './orders';
import { IShippingService } from './shipping';
import { CheckoutRequest } from './models/CheckoutRequest';
import { ShippingRates } from './models/ShippingRates';

const mockRepo: jest.Mocked<ICheckoutRepository> = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
};

const mockOrdersService: jest.Mocked<IOrdersService> = {
  create: jest.fn(),
};

const mockShippingService: jest.Mocked<IShippingService> = {
  getShippingRates: jest.fn(),
};

const shippingRates: ShippingRates = {
  shipmentId: 'ship-1',
  rates: [
    { name: 'Priority Mail', amount: 10, token: 'priority-mail', estimatedDays: 5 },
    { name: 'Express', amount: 25, token: 'express', estimatedDays: 2 },
  ],
};

const baseRequest: CheckoutRequest = {
  items: [
    { id: 'item1', name: 'Widget', quantity: 2, price: 100 },
    { id: 'item2', name: 'Gadget', quantity: 1, price: 50 },
  ],
  shippingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Main St',
    address2: '',
    city: 'Seattle',
    state: 'WA',
    zip: '98101',
    email: 'john@example.com',
  },
  deliveryOptionToken: 'priority-mail',
};

describe('CheckoutService', () => {
  let service: CheckoutService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: 'CheckoutRepository', useValue: mockRepo },
        { provide: 'OrdersService', useValue: mockOrdersService },
        { provide: 'ShippingService', useValue: mockShippingService },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
  });

  describe('get', () => {
    it('should return null when no checkout exists for customer', async () => {
      mockRepo.get.mockResolvedValue(null);
      const result = await service.get('cust1');
      expect(result).toBeNull();
    });

    it('should return deserialized Checkout when data exists', async () => {
      const checkoutJson = JSON.stringify({
        items: [{ id: 'item1', name: 'Widget', quantity: 2, price: 100, totalCost: 200 }],
        subtotal: 200,
        shipping: 10,
        tax: 5,
        total: 215,
        paymentId: 'abc123',
        paymentToken: 'tok456',
        shippingAddress: null,
        shippingRates: null,
        deliveryOptionToken: null,
      });
      mockRepo.get.mockResolvedValue(checkoutJson);
      const result = await service.get('cust1');
      expect(result).not.toBeNull();
      expect(result.subtotal).toBe(200);
    });
  });

  describe('update', () => {
    it('should compute subtotal and item totalCost correctly', async () => {
      mockShippingService.getShippingRates.mockResolvedValue(shippingRates);
      mockRepo.set.mockResolvedValue('{}');

      const result = await service.update('cust1', baseRequest);

      expect(result.subtotal).toBe(250); // 2*100 + 1*50
      expect(result.items[0].totalCost).toBe(200);
      expect(result.items[1].totalCost).toBe(50);
    });

    it('should apply shipping rate matching the deliveryOptionToken', async () => {
      mockShippingService.getShippingRates.mockResolvedValue(shippingRates);
      mockRepo.set.mockResolvedValue('{}');

      const result = await service.update('cust1', baseRequest);

      expect(result.shipping).toBe(10); // priority-mail = 10
    });

    it('should compute total as subtotal + tax + shipping', async () => {
      mockShippingService.getShippingRates.mockResolvedValue(shippingRates);
      mockRepo.set.mockResolvedValue('{}');

      const result = await service.update('cust1', baseRequest);

      // subtotal=250, tax=5, shipping=10 → total=265
      expect(result.total).toBe(265);
    });

    it('should set tax to -1 and shipping to -1 when no shippingAddress', async () => {
      mockRepo.set.mockResolvedValue('{}');
      const requestNoAddr: CheckoutRequest = {
        items: [{ id: 'item1', name: 'Widget', quantity: 1, price: 100 }],
        shippingAddress: null,
        deliveryOptionToken: null,
      };

      const result = await service.update('cust1', requestNoAddr);

      expect(result.tax).toBe(-1);
      expect(result.shipping).toBe(-1);
      expect(result.total).toBe(100); // effectiveTax=0, effectiveShipping=0
    });

    it('should set shipping to -1 when deliveryOptionToken does not match any rate', async () => {
      mockShippingService.getShippingRates.mockResolvedValue(shippingRates);
      mockRepo.set.mockResolvedValue('{}');

      const result = await service.update('cust1', {
        ...baseRequest,
        deliveryOptionToken: 'unknown-token',
      });

      expect(result.shipping).toBe(-1);
    });

    it('should set shipping to -1 when shippingService returns null rates', async () => {
      mockShippingService.getShippingRates.mockResolvedValue(null);
      mockRepo.set.mockResolvedValue('{}');

      const result = await service.update('cust1', baseRequest);

      expect(result.shipping).toBe(-1);
    });

    it('should generate a non-empty paymentId and paymentToken', async () => {
      mockShippingService.getShippingRates.mockResolvedValue(shippingRates);
      mockRepo.set.mockResolvedValue('{}');

      const result = await service.update('cust1', baseRequest);

      expect(result.paymentId).toHaveLength(16);
      expect(result.paymentToken).toHaveLength(32);
    });

    it('should persist checkout via repository', async () => {
      mockShippingService.getShippingRates.mockResolvedValue(shippingRates);
      mockRepo.set.mockResolvedValue('{}');

      await service.update('cust1', baseRequest);

      expect(mockRepo.set).toHaveBeenCalledWith('cust1', expect.any(String));
    });
  });

  describe('submit', () => {
    it('should throw an error when no checkout exists', async () => {
      mockRepo.get.mockResolvedValue(null);
      await expect(service.submit('cust1')).rejects.toThrow('Checkout not found');
    });

    it('should create an order and remove checkout on success', async () => {
      const checkoutJson = JSON.stringify({
        items: [{ id: 'item1', name: 'Widget', quantity: 2, price: 100, totalCost: 200 }],
        subtotal: 200,
        shipping: 10,
        tax: 5,
        total: 215,
        paymentId: 'abc123',
        paymentToken: 'tok456',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          address2: '',
          city: 'Seattle',
          state: 'WA',
          zip: '98101',
          email: 'john@example.com',
        },
        shippingRates: null,
        deliveryOptionToken: 'priority-mail',
      });
      mockRepo.get.mockResolvedValue(checkoutJson);
      mockOrdersService.create.mockResolvedValue({ id: 'order-99', email: 'john@example.com' });
      mockRepo.remove.mockResolvedValue(null);

      const result = await service.submit('cust1');

      expect(mockOrdersService.create).toHaveBeenCalledTimes(1);
      expect(mockRepo.remove).toHaveBeenCalledWith('cust1');
      expect(result.orderId).toBe('order-99');
      expect(result.email).toBe('john@example.com');
      expect(result.subtotal).toBe(200);
      expect(result.total).toBe(215);
    });
  });
});
