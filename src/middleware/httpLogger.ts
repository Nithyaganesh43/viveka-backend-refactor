import { Request, Response, NextFunction } from 'express';

export const httpLogger = (req: Request, _res: Response, next: NextFunction): void => {
  // Placeholder for pino-http logger; integrate a real logger when available.
  // Example: logger.info({ method: req.method, url: req.url });
  void req;
  next();
};
