import { Request, Response, NextFunction } from 'express';

export const authenticate = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

export const authorize = (..._roles: string[]) => (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

export const optionalAuth = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};
