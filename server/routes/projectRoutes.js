import express from 'express';
import { 
  addProjectMember, 
  createProject, 
  updateProject,
  getProject 
} from '../controllers/projectController.js';

const projectRouter = express.Router();

// ✅ Create a project
projectRouter.post('/', createProject);

// ✅ Get project by ID
projectRouter.get('/:projectId', getProject);

// ✅ Update a project
projectRouter.put('/:projectId', updateProject);

// ✅ Add member to project
projectRouter.post('/:projectId/members', addProjectMember);

export default projectRouter;