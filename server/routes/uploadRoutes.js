// routes/uploadRoutes.js
import express from 'express';
import { upload, uploadImage, handleUploadError } from '../controllers/uploadController.js';
import { protect } from '../middlewares/authMiddleware.js';

const uploadRouter = express.Router();

// Protected upload route - requires authentication
uploadRouter.post('/image', 
  protect,
  upload.single('image'),
  handleUploadError,
  uploadImage
);

export default uploadRouter;