import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChaosController } from './chaos.controller';
import { ChaosService } from './chaos.service';

describe('ChaosController', () => {
  let controller: ChaosController;
  let chaosService: ChaosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChaosController],
      providers: [ChaosService],
    }).compile();

    controller = module.get<ChaosController>(ChaosController);
    chaosService = module.get<ChaosService>(ChaosService);
  });

  describe('setLatency', () => {
    it('should set latency and return confirmation message', () => {
      const result = controller.setLatency('200');
      expect(result).toEqual({ message: 'Latency set to 200ms' });
      expect(chaosService.getLatencyDelay()).toBe(200);
    });

    it('should throw BadRequestException for non-numeric value', () => {
      expect(() => controller.setLatency('abc')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative value', () => {
      expect(() => controller.setLatency('-1')).toThrow(BadRequestException);
    });
  });

  describe('setErrorStatus', () => {
    it('should set error status and return confirmation message', () => {
      const result = controller.setErrorStatus('503');
      expect(result).toEqual({ message: 'Error status code set to 503' });
      expect(chaosService.getErrorStatus()).toBe(503);
    });

    it('should throw BadRequestException for non-numeric value', () => {
      expect(() => controller.setErrorStatus('xyz')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for status code below 100', () => {
      expect(() => controller.setErrorStatus('99')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for status code above 599', () => {
      expect(() => controller.setErrorStatus('600')).toThrow(BadRequestException);
    });

    it('should accept boundary value 100', () => {
      expect(() => controller.setErrorStatus('100')).not.toThrow();
    });

    it('should accept boundary value 599', () => {
      expect(() => controller.setErrorStatus('599')).not.toThrow();
    });
  });

  describe('disableLatency', () => {
    it('should disable latency and return confirmation message', () => {
      chaosService.setLatency(200);
      const result = controller.disableLatency();
      expect(result).toEqual({ message: 'Latency disabled' });
      expect(chaosService.getLatencyDelay()).toBeNull();
    });
  });

  describe('disableErrorStatus', () => {
    it('should disable error status and return confirmation message', () => {
      chaosService.setErrorStatus(503);
      const result = controller.disableErrorStatus();
      expect(result).toEqual({ message: 'Error status disabled' });
      expect(chaosService.getErrorStatus()).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('should return current chaos status', () => {
      const status = controller.getStatus();
      expect(status).toHaveProperty('latency');
      expect(status).toHaveProperty('error_status');
    });

    it('should reflect enabled latency in status', () => {
      chaosService.setLatency(300);
      const status = controller.getStatus();
      expect(status.latency.enabled).toBe(true);
      expect(status.latency.value).toBe(300);
    });
  });

  describe('setHealth', () => {
    it('should disable health and return confirmation message', () => {
      const result = controller.setHealth();
      expect(result).toEqual({ message: 'Health check endpoint disabled' });
      expect(chaosService.isSystemHealthy()).toBe(false);
    });
  });

  describe('enableHealth', () => {
    it('should re-enable health and return confirmation message', () => {
      chaosService.setHealth(false);
      const result = controller.enableHealth();
      expect(result).toEqual({ message: 'Health endpoint enabled' });
      expect(chaosService.isSystemHealthy()).toBe(true);
    });
  });
});
