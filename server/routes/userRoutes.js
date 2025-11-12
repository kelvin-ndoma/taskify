import express from 'express';
import prisma from '../configs/prisma.js';

const router = express.Router();

// Sync user from Clerk to our database
router.post('/sync', async (req, res) => {
  try {
    const { id, name, email, image } = req.body;

    if (!id || !email) {
      return res.status(400).json({ message: 'User ID and email are required' });
    }

    console.log('Syncing user to database:', { id, name, email });

    // Upsert user - create if doesn't exist, update if exists
    const user = await prisma.user.upsert({
      where: { id },
      update: {
        name,
        email,
        image,
        updatedAt: new Date(),
      },
      create: {
        id,
        name,
        email,
        image,
      },
    });

    res.json({ user, message: 'User synced successfully' });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const { userId } = await req.auth();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { name, image } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(image && { image }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.json({ user, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;