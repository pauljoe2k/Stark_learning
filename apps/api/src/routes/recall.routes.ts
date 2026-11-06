import { Router } from 'express';
import type { RecallService } from '../services/recall.service.js';
import { createRecallController } from '../controllers/recall.controller.js';

export function createRecallRouter(service: RecallService): Router {
  const router = Router();
  const controller = createRecallController(service);
  router.get('/offline', controller.offline);
  router.post('/start', controller.start);
  router.post('/:roundId/reveal', controller.reveal);
  router.post('/:roundId/result', controller.selfGrade);
  router.post('/:roundId/voice-answer', controller.voiceAnswer);
  router.post('/:roundId/finish', controller.finish);
  return router;
}
