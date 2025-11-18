// controllers/commentController.js
import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// Add comment
export const addComment = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const origin = req.get("origin");
    const { content, taskId, links = [] } = req.body; // 🆕 NEW: Added links parameter

    // Validate input
    if (!taskId || !content) {
      return res.status(400).json({ 
        message: "Task ID and content are required." 
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ 
        message: "Comment content cannot be empty." 
      });
    }

    // 🆕 NEW: Validate links if provided
    if (links && Array.isArray(links)) {
      for (const link of links) {
        if (!link.url) {
          return res.status(400).json({ message: "Link URL is required for all links." });
        }
        try {
          new URL(link.url); // Validate URL format
        } catch (error) {
          return res.status(400).json({ message: `Invalid URL: ${link.url}` });
        }
      }
    }

    // Get task with project and access info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: true
              }
            },
            members: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    // Check if user has access to the task
    const hasAccess = task.project.members.some(member => member.userId === userId) ||
                     task.project.workspace.members.some(member => member.userId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have access to comment on this task.",
      });
    }

    // Create comment with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create comment (removed containsLinks since we're separating links)
      const comment = await tx.comment.create({
        data: { 
          taskId, 
          content: content.trim(), 
          userId,
        },
        include: { 
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          } 
        },
      });

      // 🆕 NEW: Create comment links if provided
      if (links && links.length > 0) {
        await tx.commentLink.createMany({
          data: links.map((link) => ({
            url: link.url,
            commentId: comment.id,
            userId: userId,
          })),
        });
      }

      // Return comment with full details including links
      return await tx.comment.findUnique({
        where: { id: comment.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          links: { // 🆕 NEW: Include comment links
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });
    });

    console.log(`✅ Comment created: ${result.id} for task: ${taskId} with ${result.links.length} links`);

    // Trigger email event for new comment
    try {
      await inngest.send({
        name: "app/task.comment.added",
        data: {
          taskId: taskId,
          commentId: result.id,
          commenterId: userId,
          containsLinks: result.links.length > 0, // 🆕 UPDATED: Check if links exist
          origin: origin || process.env.FRONTEND_URL || "http://localhost:3000",
        },
      });
      console.log(`✅ Triggered comment notification event for task ${taskId}`);
    } catch (eventError) {
      console.error(`❌ Failed to trigger comment event for task ${taskId}:`, eventError);
    }

    res.json({ 
      comment: result, 
      message: "Comment added successfully." 
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Update comment
export const updateComment = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { commentId } = req.params;
    const { content, links } = req.body; // 🆕 NEW: Added links parameter

    if (!commentId || !content) {
      return res.status(400).json({ 
        message: "Comment ID and content are required." 
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ 
        message: "Comment content cannot be empty." 
      });
    }

    // 🆕 NEW: Validate links if provided
    if (links && Array.isArray(links)) {
      for (const link of links) {
        if (!link.url) {
          return res.status(400).json({ message: "Link URL is required for all links." });
        }
        try {
          new URL(link.url); // Validate URL format
        } catch (error) {
          return res.status(400).json({ message: `Invalid URL: ${link.url}` });
        }
      }
    }

    // Find the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        links: true, // 🆕 NEW: Include existing links
        task: {
          include: {
            project: {
              include: {
                workspace: {
                  include: {
                    members: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check if user owns the comment or is workspace admin
    const isCommentOwner = comment.userId === userId;
    const isWorkspaceAdmin = comment.task.project.workspace.members.some(
      member => member.userId === userId && member.role === "ADMIN"
    );

    if (!isCommentOwner && !isWorkspaceAdmin) {
      return res.status(403).json({
        message: "You can only edit your own comments.",
      });
    }

    // Update comment with transaction
    const updatedComment = await prisma.$transaction(async (tx) => {
      // Update comment (removed containsLinks)
      const commentUpdate = await tx.comment.update({
        where: { id: commentId },
        data: { 
          content: content.trim(),
        },
      });

      // 🆕 NEW: Update comment links if provided
      if (links !== undefined) {
        // Delete all existing links for this comment
        await tx.commentLink.deleteMany({
          where: { commentId: commentId }
        });

        // Create new links
        if (links.length > 0) {
          await tx.commentLink.createMany({
            data: links.map((link) => ({
              url: link.url,
              commentId: commentId,
              userId: userId,
            })),
          });
        }
      }

      // Return updated comment with full details including links
      return await tx.comment.findUnique({
        where: { id: commentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          links: { // 🆕 NEW: Include comment links
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });
    });

    console.log(`✅ Comment updated: ${commentId} with ${updatedComment.links.length} links`);

    res.json({ 
      comment: updatedComment, 
      message: "Comment updated successfully." 
    });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Get comments for a specific task - UPDATED to use CommentLink
export const getTaskComments = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({ message: "Task ID is required." });
    }

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: true
              }
            },
            members: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    // Check if user has access to the task
    const hasAccess = task.project.members.some(member => member.userId === userId) ||
                     task.project.workspace.members.some(member => member.userId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have access to view comments for this task.",
      });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        links: { // 🆕 UPDATED: Use CommentLink instead of LinkAttachment
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ comments });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Get comment by ID - UPDATED to use CommentLink
export const getComment = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({ message: "Comment ID is required." });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        links: { // 🆕 UPDATED: Use CommentLink instead of LinkAttachment
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        task: {
          include: {
            project: {
              include: {
                workspace: {
                  include: {
                    members: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check if user has access to the task
    const hasAccess = comment.task.project.members.some(member => member.userId === userId) ||
                     comment.task.project.workspace.members.some(member => member.userId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have access to view this comment.",
      });
    }

    res.json({ comment });
  } catch (error) {
    console.error("Get comment error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Get all comments for a project - UPDATED to use CommentLink
export const getProjectComments = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required." });
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            members: true
          }
        },
        members: true
      }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // Check if user has access to the project
    const hasAccess = project.members.some(member => member.userId === userId) ||
                     project.workspace.members.some(member => member.userId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have access to view comments for this project.",
      });
    }

    const comments = await prisma.comment.findMany({
      where: {
        task: {
          projectId: projectId
        }
      },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        links: { // 🆕 UPDATED: Use CommentLink instead of LinkAttachment
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            projectId: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ comments });
  } catch (error) {
    console.error("Get project comments error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Delete comment (no changes needed - cascade delete handles comment links)
export const deleteComment = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({ message: "Comment ID is required." });
    }

    // Find the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            project: {
              include: {
                workspace: {
                  include: {
                    members: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check if user owns the comment, is project lead, or workspace admin
    const isCommentOwner = comment.userId === userId;
    const isProjectLead = comment.task.project.team_lead === userId;
    const isWorkspaceAdmin = comment.task.project.workspace.members.some(
      member => member.userId === userId && member.role === "ADMIN"
    );

    if (!isCommentOwner && !isProjectLead && !isWorkspaceAdmin) {
      return res.status(403).json({
        message: "You don't have permission to delete this comment.",
      });
    }

    // Delete comment (comment links will be cascade deleted)
    await prisma.comment.delete({
      where: { id: commentId }
    });

    console.log(`✅ Comment deleted: ${commentId}`);

    res.json({ 
      message: "Comment deleted successfully." 
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};