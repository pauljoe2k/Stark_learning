import { Router } from 'express';
import { createPlace, deletePlace, getPlace, listPlaces, renamePlace } from '../controllers/placesController.js';
import { imageUpload } from '../middleware/upload.js';

const router = Router();

router.get('/', listPlaces);
router.post('/', imageUpload.single('image'), createPlace);
router.get('/:id', getPlace);
router.patch('/:id', renamePlace);
router.delete('/:id', deletePlace);

export default router;