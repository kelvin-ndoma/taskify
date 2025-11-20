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

const app = express();

// ✅ Enhanced CORS configuration
app.use(cors({
    origin: [
        'https://tbb-project-management.vercel.app',
        'https://www.tbbasco.com',
        'http://127.0.0.1:5173', 
        'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// ✅ EXCLUDE API ROUTES FROM CLERK MIDDLEWARE
app.use((req, res, next) => {
  // Skip Clerk middleware for your API routes
  if (req.path.startsWith('/api/workspaces') || 
      req.path.startsWith('/api/projects') ||
      req.path.startsWith('/api/tasks') ||
      req.path.startsWith('/api/comments')) {
    return next();
  }
  // Apply Clerk middleware to all other routes
  return clerkMiddleware()(req, res, next);
});

// ✅ Health check route
app.get('/', (req, res) => res.send('✅ Server is Live!'));

// ✅ Inngest webhook route (this handles Clerk webhooks)
app.use('/api/inngest', serve({ client: inngest, functions }));

// ✅ Mount your API routes WITHOUT Clerk middleware interference
app.use('/api/workspaces', protect, workspaceRouter);
app.use('/api/projects', protect, projectRouter);
app.use('/api/tasks', protect, taskRouter);
app.use('/api/comments', protect, commentRouter);

// ✅ 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));