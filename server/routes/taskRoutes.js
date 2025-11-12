// routes/taskRouter.js
import express from 'express';
import { 
    createTask, 
    deleteTask, 
    updateTask, 
    deleteTasks,
    getTask,
    getProjectTasks 
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

export default taskRouter;