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

// 🚨 ADD THIS DEBUG MIDDLEWARE
app.use((req, res, next) => {
  if (req.path.includes('/workspaces') && req.method === 'POST') {
    console.log('🔍 ALL ROUTE ACCESS:', {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// ✅ Health check route
app.get('/', (req, res) => res.send('✅ Server is Live!'));

// ✅ Inngest webhook route
app.use('/api/inngest', serve({ client: inngest, functions }));

// 🚨 ADD SPECIFIC DEBUG FOR WORKSPACE ROUTES
app.use('/api/workspaces', (req, res, next) => {
  console.log('🛣️ WORKSPACE ROUTER ACCESS:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
  next();
});

// ✅ Mount routes
app.use('/api/workspaces', protect, workspaceRouter);
app.use('/api/projects', protect, projectRouter);
app.use('/api/tasks', protect, taskRouter);
app.use('/api/comments', protect, commentRouter);

// 🚨 ADD TEMPORARY TEST ROUTE - PUT THIS BEFORE 404
app.post('/api/workspaces/test-members', protect, (req, res) => {
  console.log('🎯 TEST ROUTE HIT!');
  res.json({ success: true, message: 'Test route working' });
});

// ✅ 404 fallback
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
  res.status(404).json({ message: 'Route not found' });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));