import express from 'express';
import { addComment, getTaskComments } from '../controllers/commentController.js';

const commentRouter = express.Router();

// ✅ Get all comments for a task
commentRouter.get('/:taskId', getTaskComments);

// ✅ Add new comment to a task
commentRouter.post('/', addComment);

export default commentRouter;
