import { Router } from 'express';
import { createExam, deleteExam, listExams, updateExam } from '../controllers/examsController.js';

const router = Router();

router.get('/', listExams);
router.post('/', createExam);
router.patch('/:id', updateExam);
router.delete('/:id', deleteExam);

export default router;