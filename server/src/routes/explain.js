import { Router } from 'express';
import { getExplanation } from '../controllers/topicsController.js';

const router = Router();

router.get('/:id', getExplanation);

export default router;