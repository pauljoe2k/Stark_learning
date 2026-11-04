import { Router } from 'express';
import { createUnit, deleteUnit, listUnits, updateUnit } from '../controllers/unitsController.js';

const router = Router();

router.get('/', listUnits);
router.post('/', createUnit);
router.patch('/:id', updateUnit);
router.delete('/:id', deleteUnit);

export default router;
