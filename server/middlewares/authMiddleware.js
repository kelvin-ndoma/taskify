// middlewares/authMiddleware.js
import { verifyToken } from '../utils/auth.js';
import prisma from '../configs/prisma.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        message: "Not authorized, no token provided" 
      });
    }

    // Verify JWT token
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ 
        message: "Not authorized, invalid token" 
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId 
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        workspaces: {
          include: {
            workspace: {
              include: {
                projects: {
                  include: {
                    folders: {
                      include: {
                        tasks: {
                          include: {
                            assignees: {
                              include: {
                                user: {
                                  select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    image: true
                                  }
                                }
                              }
                            },
                            comments: {
                              include: {
                                user: {
                                  select: {
                                    id: true,
                                    name: true,
                                    image: true
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    tasks: {
                      where: {
                        folderId: null
                      },
                      include: {
                        assignees: {
                          include: {
                            user: {
                              select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                              }
                            }
                          }
                        },
                        comments: {
                          include: {
                            user: {
                              select: {
                                id: true,
                                name: true,
                                image: true
                              }
                            }
                          }
                        }
                      }
                    },
                    members: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ 
        message: "Not authorized, user not found" 
      });
    }

    // Check if email is verified (optional - you can remove this if you want to allow unverified users)
    if (!user.emailVerified) {
      return res.status(403).json({
        requiresVerification: true,
        message: "Please verify your email before accessing protected resources",
      });
    }

    // Attach user to request object
    req.user = user;

    // Continue to the next middleware/controller
    next();

  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: "Not authorized, invalid token" 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: "Not authorized, token expired" 
      });
    }

    res.status(401).json({ 
      message: "Not authorized, authentication failed" 
    });
  }
};