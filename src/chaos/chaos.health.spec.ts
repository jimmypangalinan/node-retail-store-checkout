import { HealthCheckError } from '@nestjs/terminus';
import { ChaosHealthIndicator } from './chaos.health';
import { ChaosService } from './chaos.service';

describe('ChaosHealthIndicator', () => {
  let indicator: ChaosHealthIndicator;
  let chaosService: ChaosService;

  beforeEach(() => {
    chaosService = new ChaosService();
    indicator = new ChaosHealthIndicator(chaosService);
  });

  it('should return healthy status when system is healthy', async () => {
    const result = await indicator.isHealthy('chaos');
    expect(result).toEqual({ chaos: { status: 'up' } });
  });

  it('should use default key "chaos" when no key is provided', async () => {
    const result = await indicator.isHealthy();
    expect(result).toHaveProperty('chaos');
    expect(result.chaos.status).toBe('up');
  });

  it('should throw HealthCheckError when system is unhealthy', async () => {
    chaosService.setHealth(false);
    await expect(indicator.isHealthy('chaos')).rejects.toThrow(HealthCheckError);
  });

  it('should include down status in HealthCheckError when unhealthy', async () => {
    chaosService.setHealth(false);
    try {
      await indicator.isHealthy('chaos');
      fail('Expected HealthCheckError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HealthCheckError);
      expect(err.causes).toHaveProperty('chaos');
      expect(err.causes.chaos.status).toBe('down');
    }
  });
});
