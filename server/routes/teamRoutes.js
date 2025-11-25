// routes/teamRoutes.js
import express from 'express';
import {
  getMemberTasks,
  getMemberStats,
  getWorkspaceTeamMembers
} from '../controllers/teamController.js';

const teamRouter = express.Router();

// Get tasks for a specific team member in a workspace
router.get('/:workspaceId/members/:memberId/tasks', getMemberTasks);

// Get statistics for a specific team member
router.get('/:workspaceId/members/:memberId/stats', getMemberStats);

// Get all team members with their task counts for a workspace
router.get('/:workspaceId/team-members', getWorkspaceTeamMembers);

export default teamRouter;