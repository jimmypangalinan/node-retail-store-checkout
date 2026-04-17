import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { Checkout } from './models/Checkout';
import { CheckoutRequest } from './models/CheckoutRequest';
import { CheckoutSubmitted } from './models/CheckoutSubmitted';

const mockCheckoutService = {
  get: jest.fn(),
  update: jest.fn(),
  submit: jest.fn(),
};

const sampleCheckout: Checkout = {
  items: [{ id: 'item1', name: 'Widget', quantity: 2, price: 100, totalCost: 200 }],
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
  shippingRates: null,
  paymentId: 'pay123',
  paymentToken: 'tok456',
  subtotal: 200,
  shipping: 10,
  tax: 5,
  total: 215,
};

describe('CheckoutController', () => {
  let controller: CheckoutController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [{ provide: CheckoutService, useValue: mockCheckoutService }],
    }).compile();

    controller = module.get<CheckoutController>(CheckoutController);
  });

  describe('getCheckout', () => {
    it('should return checkout when it exists', async () => {
      mockCheckoutService.get.mockResolvedValue(sampleCheckout);
      const result = await controller.getCheckout('cust1');
      expect(result).toEqual(sampleCheckout);
      expect(mockCheckoutService.get).toHaveBeenCalledWith('cust1');
    });

    it('should throw NotFoundException when checkout does not exist', async () => {
      mockCheckoutService.get.mockResolvedValue(null);
      await expect(controller.getCheckout('cust1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCheckout', () => {
    it('should update and return checkout', async () => {
      mockCheckoutService.update.mockResolvedValue(sampleCheckout);
      const request: CheckoutRequest = {
        items: [{ id: 'item1', name: 'Widget', quantity: 2, price: 100 }],
        shippingAddress: sampleCheckout.shippingAddress,
        deliveryOptionToken: 'priority-mail',
      };

      const result = await controller.updateCheckout('cust1', request);
      expect(result).toEqual(sampleCheckout);
      expect(mockCheckoutService.update).toHaveBeenCalledWith('cust1', request);
    });
  });

  describe('submitCheckout', () => {
    it('should submit and return CheckoutSubmitted', async () => {
      const submitted: CheckoutSubmitted = {
        orderId: 'order-99',
        email: 'john@example.com',
        items: sampleCheckout.items,
        subtotal: 200,
        shipping: 10,
        tax: 5,
        total: 215,
      };
      mockCheckoutService.submit.mockResolvedValue(submitted);

      const result = await controller.submitCheckout('cust1');
      expect(result).toEqual(submitted);
      expect(mockCheckoutService.submit).toHaveBeenCalledWith('cust1');
    });
  });
});
