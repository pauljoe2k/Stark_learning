import { Router } from 'express';
import { createFlag, deleteFlag, updateFlag } from '../controllers/flagsController.js';

const router = Router();

router.post('/', createFlag);
router.patch('/:id', updateFlag);
router.delete('/:id', deleteFlag);

export default router;