// src/routes/workspaceRoutes.js - UPDATED
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

// Ensure default workspace for a user - FIXED
workspaceRouter.post('/ensure-default', async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('🔍 /ensure-default - Request received for user:', userId);
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    const workspace = await ensureDefaultWorkspace(userId);
    
    if (!workspace) {
      console.log('❌ /ensure-default - Failed to ensure default workspace for user:', userId);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to ensure default workspace' 
      });
    }

    console.log('✅ /ensure-default - Success for user:', userId, 'workspace:', workspace.id);
    
    res.json({ 
      success: true, 
      workspace,
      message: 'Default workspace ensured successfully'
    });
    
  } catch (error) {
    console.error('❌ /ensure-default - Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

export default workspaceRouter;