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
  createFolder, // NEW: Import folder functions
  updateFolder,
  deleteFolder
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

// ✅ FOLDER MANAGEMENT ROUTES - NEW

// ✅ Create folder in project
projectRouter.post('/:projectId/folders', createFolder);

// ✅ Update folder
projectRouter.put('/folders/:folderId', updateFolder);

// ✅ Delete folder
projectRouter.delete('/folders/:folderId', deleteFolder);

export default projectRouter;