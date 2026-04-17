import { ChaosMiddleware } from './chaos.middleware';
import { ChaosService } from './chaos.service';
import { Request, Response, NextFunction } from 'express';

describe('ChaosMiddleware', () => {
  let middleware: ChaosMiddleware;
  let chaosService: ChaosService;

  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  function makeReq(path: string): Request {
    return { path } as unknown as Request;
  }

  beforeEach(() => {
    chaosService = new ChaosService();
    middleware = new ChaosMiddleware(chaosService);

    mockRes = {
      sendStatus: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should call next() when no chaos is active', async () => {
    await middleware.use(makeReq('/checkout/123'), mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRes.sendStatus).not.toHaveBeenCalled();
  });

  it('should skip chaos for /chaos paths and call next()', async () => {
    await middleware.use(makeReq('/chaos/latency/100'), mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should introduce latency delay when latency is enabled', async () => {
    chaosService.setLatency(50);
    const start = Date.now();
    await middleware.use(makeReq('/checkout/123'), mockRes as Response, mockNext);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should return error status when error status is enabled', async () => {
    chaosService.setErrorStatus(503);
    await middleware.use(makeReq('/checkout/123'), mockRes as Response, mockNext);
    expect(mockRes.sendStatus).toHaveBeenCalledWith(503);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() after latency when no error status is set', async () => {
    chaosService.setLatency(20);
    await middleware.use(makeReq('/checkout/123'), mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRes.sendStatus).not.toHaveBeenCalled();
  });
});
