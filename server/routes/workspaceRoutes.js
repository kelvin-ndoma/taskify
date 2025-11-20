// src/routes/workspaceRoutes.js
import express from 'express';
import { 
  getUserWorkspaces, 
  addMember, 
  removeMember,
  deleteWorkspace,
  updateWorkspace,
  getWorkspaceById,
  updateMemberRole,
  ensureDefaultWorkspace
} from '../controllers/workspaceController.js';

const workspaceRouter = express.Router();

// ✅ FIXED ORDER: Static routes first
workspaceRouter.get('/', getUserWorkspaces);

// ✅ Ensure default workspace route - MOVED UP
workspaceRouter.post('/ensure-default', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const workspace = await ensureDefaultWorkspace(userId);
    res.json({ workspace });
  } catch (error) {
    console.error('Error ensuring default workspace:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// ✅ THEN parameterized routes
workspaceRouter.get('/:workspaceId', getWorkspaceById);
workspaceRouter.post('/:workspaceId/members', addMember);
workspaceRouter.delete('/:workspaceId/members/:userId', removeMember);
workspaceRouter.patch('/:workspaceId/members/:userId/role', updateMemberRole);
workspaceRouter.put('/:workspaceId', updateWorkspace);
workspaceRouter.delete('/:workspaceId', deleteWorkspace);

export default workspaceRouter;