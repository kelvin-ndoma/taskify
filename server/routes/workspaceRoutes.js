import express from 'express';
import { addMember, getUserWorkspaces } from '../controllers/workspaceController.js';

const workspaceRouter = express.Router();

// ✅ Get all workspaces for logged-in user
workspaceRouter.get('/', getUserWorkspaces);

// ✅ Add member to a workspace
workspaceRouter.post('/:workspaceId/members', addMember);

export default workspaceRouter;
