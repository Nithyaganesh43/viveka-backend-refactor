import { Request, Response } from 'express';
import { sampleSchema } from './validation.js';

export class SampleController {
  getSample = (_req: Request, res: Response): void => {
    res.json({ success: true, data: { message: 'sample ok' } });
  };

  createSample = (req: Request, res: Response): void => {
    const parsed = sampleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    res.status(201).json({ success: true, data: parsed.data });
  };
}
