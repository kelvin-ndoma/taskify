// src/routes/projectRoutes.js
import express from 'express';
import { 
  addProjectMember, 
  createProject, 
  updateProject,
  getProject,
  getProjects,
  deleteProject,
  removeProjectMember,
  getProjectStats,
  updateProjectProgress,
  // Folder operations
  createFolder,
  getProjectFolders,
  updateFolder,
  deleteFolder,
  reorderFolders
} from '../controllers/projectController.js';

const projectRouter = express.Router();

// ✅ Get all projects for workspace
projectRouter.get('/', getProjects);

// ✅ Create a project
projectRouter.post('/', createProject);

// ✅ Get project by ID
projectRouter.get('/:projectId', getProject);

// ✅ Get project statistics
projectRouter.get('/:projectId/stats', getProjectStats);

// ✅ Update a project
projectRouter.put('/:projectId', updateProject);

// ✅ Update project progress
projectRouter.patch('/:projectId/progress', updateProjectProgress);

// ✅ Delete a project
projectRouter.delete('/:projectId', deleteProject);

// ✅ Add member to project
projectRouter.post('/:projectId/members', addProjectMember);

// ✅ Remove member from project
projectRouter.delete('/:projectId/members/:memberId', removeProjectMember);

// ✅ FOLDER ROUTES

// ✅ Create folder in project
projectRouter.post('/:projectId/folders', createFolder);

// ✅ Get all folders for a project
projectRouter.get('/:projectId/folders', getProjectFolders);

// ✅ Update folder in project
projectRouter.put('/:projectId/folders/:folderId', updateFolder);

// ✅ Delete folder from project
projectRouter.delete('/:projectId/folders/:folderId', deleteFolder);

// ✅ Reorder folders in project
projectRouter.patch('/:projectId/folders/reorder', reorderFolders);

export default projectRouter;