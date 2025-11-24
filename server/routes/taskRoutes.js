// routes/taskRouter.js
import express from 'express';
import { 
    createTask, 
    deleteTask, 
    updateTask, 
    deleteTasks,
    getTask,
    getProjectTasks,
    getFolderTasks // NEW: Get tasks by folder
} from '../controllers/taskController.js';

const taskRouter = express.Router();

// ✅ Create a task (can now include folderId)
taskRouter.post('/', createTask);

// ✅ Update a task by ID (can now update folderId and position)
taskRouter.put('/:id', updateTask);

// ✅ Delete a single task by ID
taskRouter.delete('/:id', deleteTask);

// ✅ Delete multiple tasks (bulk deletion)
taskRouter.delete('/', deleteTasks);

// ✅ Get a single task by ID
taskRouter.get('/:id', getTask);

// ✅ Get all tasks for a project (includes both folder tasks and root tasks)
taskRouter.get('/project/:projectId', getProjectTasks);

// ✅ NEW: Get all tasks for a specific folder
taskRouter.get('/folder/:folderId', getFolderTasks);

export default taskRouter;