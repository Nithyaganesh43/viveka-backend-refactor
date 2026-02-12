import { Response } from 'express';

export const sendResponse = <T>(res: Response, status: number, data: T): void => {
  res.status(status).json(data);
};
