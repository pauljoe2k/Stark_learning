import { Router } from 'express';
import { finishRecall, recallHistory, revealFlag, saveRecallResult, startRecall } from '../controllers/recallController.js';

const router = Router();

router.post('/start', startRecall);
router.get('/history', recallHistory);
router.post('/:roundId/reveal', revealFlag);
router.post('/:roundId/result', saveRecallResult);
router.post('/:roundId/finish', finishRecall);

export default router;