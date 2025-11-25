// SIMPLER CORS setup
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';
import workspaceRouter from './routes/workspaceRoutes.js';
import projectRouter from './routes/projectRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import { protect } from './middlewares/authMiddleware.js';
import teamRouter from './routes/teamRoutes.js';

const app = express();

// ✅ Simple CORS configuration
app.use(cors({
    origin: [
        'https://tbb-project-management.vercel.app',
        'https://www.tbbasco.com',
        'http://127.0.0.1:5173', 
        'http://localhost:5173'
    ],
    credentials: true
}));

app.use(express.json());
app.use(clerkMiddleware());

// ✅ Health check route
app.get('/', (req, res) => res.send('✅ Server is Live!'));

// ✅ Inngest webhook route
app.use('/api/inngest', serve({ client: inngest, functions }));

// ✅ Mount routes
app.use('/api/workspaces', protect, workspaceRouter);
app.use('/api/projects', protect, projectRouter);
app.use('/api/tasks', protect, taskRouter);
app.use('/api/comments', protect, commentRouter);
app.use('/api/team', protect, teamRouter)

// ✅ 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));