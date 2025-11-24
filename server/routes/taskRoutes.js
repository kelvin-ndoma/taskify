// routes/taskRouter.js
import express from 'express';
import { 
    createTask, 
    deleteTask, 
    updateTask, 
    deleteTasks,
    getTask,
    getProjectTasks,
    getFolderTasks // NEW: Import folder tasks function
} from '../controllers/taskController.js';

const taskRouter = express.Router();

// ✅ Create a task
taskRouter.post('/', createTask);

// ✅ Update a task by ID
taskRouter.put('/:id', updateTask);

// ✅ Delete a single task by ID
taskRouter.delete('/:id', deleteTask);

// ✅ Delete multiple tasks (bulk deletion)
taskRouter.delete('/', deleteTasks);

// ✅ Get a single task by ID
taskRouter.get('/:id', getTask);

// ✅ Get all tasks for a project
taskRouter.get('/project/:projectId', getProjectTasks);

// ✅ Get all tasks for a folder - NEW
taskRouter.get('/folder/:folderId', getFolderTasks);

export default taskRouter;