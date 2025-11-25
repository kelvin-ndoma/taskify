// server.js (or app.js)
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { serve } from 'inngest/express';
import { inngest, functions } from './inngest/index.js';

// Import routes
import authRouter from './routes/authRoutes.js';
import workspaceRouter from './routes/workspaceRoutes.js';
import projectRouter from './routes/projectRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import teamRouter from './routes/teamRoutes.js';

// Import custom auth middleware
import { protect } from './middlewares/authMiddleware.js';

const app = express();

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:5173', // Your Vite dev server
        'http://127.0.0.1:5173',
        'https://tbb-project-management.vercel.app',
        'https://www.tbbasco.com'
    ],
    credentials: true
}));

app.use(express.json());

// ✅ Public auth routes - NO protect middleware here!
app.use('/api/auth', authRouter);

// Health check
app.get('/', (req, res) => res.send('✅ Server is Live!'));

// Inngest webhook route
app.use('/api/inngest', serve({ client: inngest, functions }));

// ✅ Protected routes (use custom auth middleware)
app.use('/api/workspaces', protect, workspaceRouter);
app.use('/api/projects', protect, projectRouter);
app.use('/api/tasks', protect, taskRouter);
app.use('/api/comments', protect, commentRouter);
app.use('/api/team', protect, teamRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));