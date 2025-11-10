import express from 'express';
import { addMember, createProject, updateProject } from '../controllers/projectController.js';

const projectRouter = express.Router();

// ✅ Create a project
projectRouter.post('/', createProject);

// ✅ Update a project (use PUT)
projectRouter.put('/:id', updateProject);

// ✅ Add member to project
projectRouter.post('/:projectId/members', addMember);

export default projectRouter;
