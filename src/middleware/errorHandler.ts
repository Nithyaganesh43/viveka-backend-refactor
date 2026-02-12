import { Request, Response, NextFunction } from 'express';

export const asyncHandler = <T extends (...args: any[]) => Promise<any>>(fn: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({ success: false, message });
};
