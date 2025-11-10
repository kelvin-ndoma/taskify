import express from 'express';
import { 
  addMember, 
  getUserWorkspaces,
  ensureDefaultWorkspace 
} from '../controllers/workspaceController.js';

const workspaceRouter = express.Router();

// ✅ Get all workspaces for logged-in user
workspaceRouter.get('/', getUserWorkspaces);

// ✅ Add member to a workspace
workspaceRouter.post('/:workspaceId/members', addMember);

// ✅ Ensure default workspace exists (for testing/admin)
workspaceRouter.post('/ensure-default', ensureDefaultWorkspace);

export default workspaceRouter;