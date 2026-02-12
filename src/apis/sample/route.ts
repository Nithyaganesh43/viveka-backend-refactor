import { Router } from 'express';
import { SampleController } from './controller.js';

const router = Router();
const controller = new SampleController();

router.get('/', controller.getSample);
router.post('/', controller.createSample);

export default router;
