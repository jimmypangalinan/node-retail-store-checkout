import { ChaosService } from './chaos.service';

describe('ChaosService', () => {
  let service: ChaosService;

  beforeEach(() => {
    service = new ChaosService();
  });

  describe('initial state', () => {
    it('should report system healthy by default', () => {
      expect(service.isSystemHealthy()).toBe(true);
    });

    it('should return null latency delay by default', () => {
      expect(service.getLatencyDelay()).toBeNull();
    });

    it('should return null error status by default', () => {
      expect(service.getErrorStatus()).toBeNull();
    });

    it('getStatus should reflect disabled by default', () => {
      const status = service.getStatus();
      expect(status.latency.enabled).toBe(false);
      expect(status.latency.value).toBe(0);
      expect(status.error_status.enabled).toBe(false);
      expect(status.error_status.code).toBe(0);
    });
  });

  describe('latency', () => {
    it('should enable latency after setLatency', () => {
      service.setLatency(200);
      expect(service.getLatencyDelay()).toBe(200);
    });

    it('should reflect latency in getStatus', () => {
      service.setLatency(500);
      const status = service.getStatus();
      expect(status.latency.enabled).toBe(true);
      expect(status.latency.value).toBe(500);
    });

    it('should disable latency after disableLatency', () => {
      service.setLatency(200);
      service.disableLatency();
      expect(service.getLatencyDelay()).toBeNull();
    });

    it('getStatus should show latency disabled after disableLatency', () => {
      service.setLatency(200);
      service.disableLatency();
      expect(service.getStatus().latency.enabled).toBe(false);
    });
  });

  describe('error status', () => {
    it('should enable error status after setErrorStatus', () => {
      service.setErrorStatus(503);
      expect(service.getErrorStatus()).toBe(503);
    });

    it('should reflect error status in getStatus', () => {
      service.setErrorStatus(500);
      const status = service.getStatus();
      expect(status.error_status.enabled).toBe(true);
      expect(status.error_status.code).toBe(500);
    });

    it('should disable error status after disableErrorStatus', () => {
      service.setErrorStatus(503);
      service.disableErrorStatus();
      expect(service.getErrorStatus()).toBeNull();
    });

    it('getStatus should show error_status disabled after disableErrorStatus', () => {
      service.setErrorStatus(503);
      service.disableErrorStatus();
      expect(service.getStatus().error_status.enabled).toBe(false);
    });
  });

  describe('health', () => {
    it('should report unhealthy after setHealth(false)', () => {
      service.setHealth(false);
      expect(service.isSystemHealthy()).toBe(false);
    });

    it('should report healthy again after setHealth(true)', () => {
      service.setHealth(false);
      service.setHealth(true);
      expect(service.isSystemHealthy()).toBe(true);
    });
  });

  describe('shouldApplyChaos', () => {
    it('should return false for /chaos paths', () => {
      expect(service.shouldApplyChaos('/chaos/latency/100')).toBe(false);
      expect(service.shouldApplyChaos('/chaos')).toBe(false);
    });

    it('should return true for non-chaos paths', () => {
      expect(service.shouldApplyChaos('/checkout/123')).toBe(true);
      expect(service.shouldApplyChaos('/health')).toBe(true);
      expect(service.shouldApplyChaos('/')).toBe(true);
    });
  });
});
