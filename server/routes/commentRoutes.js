// src/routes/commentRoutes.js
import express from 'express';
import { 
  addComment, 
  getTaskComments, 
  updateComment, 
  deleteComment,
  getComment,
  getProjectComments,
  getFolderComments // NEW: Import folder comments function
} from '../controllers/commentController.js';

const commentRouter = express.Router();

// ✅ Get all comments for a task
commentRouter.get('/task/:taskId', getTaskComments);

// ✅ Get all comments for a project
commentRouter.get('/project/:projectId', getProjectComments);

// ✅ Get all comments for a folder - NEW
commentRouter.get('/folder/:folderId', getFolderComments);

// ✅ Get single comment by ID
commentRouter.get('/:commentId', getComment);

// ✅ Add new comment to a task
commentRouter.post('/', addComment);

// ✅ Update a comment
commentRouter.put('/:commentId', updateComment);

// ✅ Delete a comment
commentRouter.delete('/:commentId', deleteComment);

export default commentRouter;