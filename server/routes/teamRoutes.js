// routes/teamRoutes.js
import express from 'express';
import {
  getMemberTasks,
  getMemberStats,
  getWorkspaceTeamMembers
} from '../controllers/teamController.js';

const teamRouter = express.Router(); // ✅ Make sure this line exists

// Get tasks for a specific team member in a workspace
teamRouter.get('/:workspaceId/members/:memberId/tasks', getMemberTasks);

// Get statistics for a specific team member
teamRouter.get('/:workspaceId/members/:memberId/stats', getMemberStats);

// Get all team members with their task counts for a workspace
teamRouter.get('/:workspaceId/team-members', getWorkspaceTeamMembers);

export default teamRouter; // ✅ Make sure this line exists