import express from 'express';
import { createTask, deleteTask, updateTask } from '../controllers/taskController.js';

const taskRouter = express.Router();

// ✅ Create a task
taskRouter.post('/', createTask);

// ✅ Update a task by ID
taskRouter.put('/:id', updateTask);

// ✅ Delete a task
taskRouter.delete('/:id', deleteTask);

export default taskRouter;
