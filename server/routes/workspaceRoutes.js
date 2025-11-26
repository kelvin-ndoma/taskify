// src/routes/workspaceRoutes.js
import express from 'express';
import { 
  createWorkspace,
  getUserWorkspaces, 
  addMember, 
  removeMember,
  deleteWorkspace,
  updateWorkspace,
  getWorkspaceById,
  updateMemberRole,
  ensureDefaultWorkspace,
  getWorkspaceLimits, // 🆕 NEW
  createWorkspaceForUser // 🆕 NEW
} from '../controllers/workspaceController.js';

const workspaceRouter = express.Router();

// 🆕 CREATE WORKSPACE - Regular users and admins
workspaceRouter.post('/', createWorkspace);

// 🆕 NEW: Get workspace creation limits
workspaceRouter.get('/limits', getWorkspaceLimits);

// 🆕 NEW: Admin endpoint to create workspace for other users
workspaceRouter.post('/admin/create-for-user', createWorkspaceForUser);

// Get all workspaces for current user
workspaceRouter.get('/', getUserWorkspaces);

// Get specific workspace by ID
workspaceRouter.get('/:workspaceId', getWorkspaceById);

// Add member to workspace
workspaceRouter.post('/:workspaceId/members', addMember);

// Remove member from workspace
workspaceRouter.delete('/:workspaceId/members/:userId', removeMember);

// Update member role
workspaceRouter.patch('/:workspaceId/members/:userId/role', updateMemberRole);

// Update workspace
workspaceRouter.put('/:workspaceId', updateWorkspace);

// Delete workspace
workspaceRouter.delete('/:workspaceId', deleteWorkspace);

// Ensure default workspace for a user
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

export default workspaceRouter;