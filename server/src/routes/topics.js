import { Router } from 'express';
import {
  createTopic,
  deleteTopic,
  deleteTopicFile,
  extractTopic,
  getExplanation,
  getTopic,
  listExplanations,
  listTopics,
  updateTopic,
  uploadTopicFiles,
} from '../controllers/topicsController.js';
import { explainTopic } from '../controllers/explainController.js';
import { materialUpload } from '../middleware/upload.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', listTopics);
router.post('/', createTopic);
router.get('/:id/explanations', listExplanations);
router.post('/:id/explain', rateLimit({ windowMs: 60_000, max: 8 }), explainTopic);
router.post('/:id/files', materialUpload.array('files', 2), rateLimit({ windowMs: 60_000, max: 5 }), uploadTopicFiles);
router.post('/:id/extract', materialUpload.array('files', 2), rateLimit({ windowMs: 60_000, max: 5 }), extractTopic);
router.delete('/:id/files/:fileId', deleteTopicFile);
router.get('/:id', getTopic);
router.patch('/:id', updateTopic);
router.delete('/:id', deleteTopic);

export default router;