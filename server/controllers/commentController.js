// controllers/commentController.js
import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// Add comment
export const addComment = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const origin = req.get("origin");
    const { content, taskId, links = [] } = req.body;

    console.log("📥 Received comment request:", { 
      userId, 
      taskId, 
      contentLength: content?.length,
      linksCount: links?.length,
      linksData: links
    });

    // FIXED: Allow comments with only links (no content)
    if (!taskId || (!content?.trim() && links.length === 0)) {
      return res.status(400).json({ 
        message: "Task ID and either content or links are required." 
      });
    }

    // Validate links if provided
    if (links && Array.isArray(links)) {
      for (const link of links) {
        if (!link.url) {
          return res.status(400).json({ message: "Link URL is required for all links." });
        }
        try {
          new URL(link.url);
        } catch (error) {
          return res.status(400).json({ message: `Invalid URL: ${link.url}` });
        }
      }
    }

    // Get task with project and access info - UPDATED: Include folder info
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
        },
        folder: { // NEW: Include folder info
          select: {
            id: true,
            name: true,
            projectId: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    // Check if user has access to the task - UPDATED: Consider folder context
    const hasAccess = task.project.members.some(member => member.userId === userId) ||
                     task.project.workspace.members.some(member => member.userId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have access to comment on this task.",
      });
    }

    console.log("🔄 Starting transaction to create comment with links...");

    // Create comment with transaction - FIXED VERSION
    const result = await prisma.$transaction(async (tx) => {
      try {
        // Step 1: Create the comment first
        const comment = await tx.comment.create({
          data: { 
            taskId, 
            content: content?.trim() || "", // Allow empty content if links exist
            userId,
          },
        });

        console.log(`✅ Comment created: ${comment.id}`);

        // Step 2: Create comment links if provided - FIXED: Use createMany
        if (links && links.length > 0) {
          console.log(`🔄 Creating ${links.length} comment links...`);
          
          const linkCreationData = links.map((link) => ({
            url: link.url,
            commentId: comment.id,
            userId: userId,
          }));

          await tx.commentLink.createMany({
            data: linkCreationData,
            skipDuplicates: true,
          });
          
          console.log(`✅ Created ${links.length} comment links for comment ${comment.id}`);
        }

        // Step 3: Fetch the complete comment with all relationships - UPDATED: Include task with folder
        const completeComment = await tx.comment.findUnique({
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
            links: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc'
              }
            },
            task: { // NEW: Include task with folder info
              select: {
                id: true,
                title: true,
                folderId: true,
                folder: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                project: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
        });

        console.log(`📊 Complete comment fetched:`, {
          id: completeComment.id,
          linksCount: completeComment.links?.length || 0,
          links: completeComment.links || [],
          taskFolder: completeComment.task.folder
        });

        return completeComment;

      } catch (transactionError) {
        console.error("❌ Transaction error:", transactionError);
        throw new Error(`Failed to create comment with links: ${transactionError.message}`);
      }
    });

    console.log(`🎉 Final result: Comment ${result.id} with ${result.links?.length || 0} links`);

    // Trigger email event for new comment
    try {
      await inngest.send({
        name: "app/task.comment.added",
        data: {
          taskId: taskId,
          commentId: result.id,
          commenterId: userId,
          containsLinks: result.links?.length > 0,
          taskFolder: result.task.folder?.name || null, // NEW: Include folder info
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
    console.error("💥 Add comment error:", error);
    
    // Better error handling
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: "A comment link with this URL already exists for this comment." 
      });
    }
    
    res.status(500).json({ 
      message: error.message || "Internal server error while creating comment",
      code: error.code
    });
  }
};

// Update comment
export const updateComment = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { commentId } = req.params;
    const { content, links } = req.body;

    console.log("📥 Received comment update request:", { 
      userId, 
      commentId,
      contentLength: content?.length,
      linksCount: links?.length 
    });

    // FIXED: Allow comments with only links
    if (!commentId || (!content?.trim() && (!links || links.length === 0))) {
      return res.status(400).json({ 
        message: "Comment ID and either content or links are required." 
      });
    }

    // Validate links if provided
    if (links && Array.isArray(links)) {
      for (const link of links) {
        if (!link.url) {
          return res.status(400).json({ message: "Link URL is required for all links." });
        }
        try {
          new URL(link.url);
        } catch (error) {
          return res.status(400).json({ message: `Invalid URL: ${link.url}` });
        }
      }
    }

    // Find the comment - UPDATED: Include folder info
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        links: {
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
            folder: { // NEW: Include folder
              select: {
                id: true,
                name: true
              }
            },
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

    console.log("🔄 Starting transaction to update comment...");

    // Update comment with transaction
    const updatedComment = await prisma.$transaction(async (tx) => {
      try {
        // Update comment content
        await tx.comment.update({
          where: { id: commentId },
          data: { 
            content: content?.trim() || "",
          },
        });

        console.log(`✅ Comment content updated: ${commentId}`);

        // Handle links update - FIXED: Use createMany
        if (links !== undefined) {
          console.log(`🔄 Updating comment links...`);
          
          // Delete all existing links for this comment
          await tx.commentLink.deleteMany({
            where: { commentId: commentId }
          });
          console.log(`✅ Deleted existing links for comment ${commentId}`);

          // Create new links if provided
          if (links.length > 0) {
            const linkCreationData = links.map((link) => ({
              url: link.url,
              commentId: commentId,
              userId: userId,
            }));

            await tx.commentLink.createMany({
              data: linkCreationData,
              skipDuplicates: true,
            });
            console.log(`✅ Created ${links.length} new links for comment ${commentId}`);
          }
        }

        // Fetch the complete updated comment - UPDATED: Include task with folder
        const completeComment = await tx.comment.findUnique({
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
            links: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc'
              }
            },
            task: { // NEW: Include task with folder info
              select: {
                id: true,
                title: true,
                folderId: true,
                folder: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                project: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
        });

        console.log(`📊 Updated comment fetched:`, {
          id: completeComment.id,
          linksCount: completeComment.links?.length || 0,
          taskFolder: completeComment.task.folder
        });

        return completeComment;

      } catch (transactionError) {
        console.error("❌ Transaction error:", transactionError);
        throw new Error(`Failed to update comment with links: ${transactionError.message}`);
      }
    });

    console.log(`🎉 Comment updated: ${commentId} with ${updatedComment.links?.length || 0} links`);

    res.json({ 
      comment: updatedComment, 
      message: "Comment updated successfully." 
    });
  } catch (error) {
    console.error("💥 Update comment error:", error);
    res.status(500).json({ 
      message: error.message || "Internal server error",
      code: error.code
    });
  }
};

// Get comments for a specific task
export const getTaskComments = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { taskId } = req.params;

    console.log("📥 Fetching comments for task:", taskId);

    if (!taskId) {
      return res.status(400).json({ message: "Task ID is required." });
    }

    // Verify task exists and user has access - UPDATED: Include folder info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        folder: { // NEW: Include folder
          select: {
            id: true,
            name: true
          }
        },
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
        links: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        task: { // NEW: Include task with folder info
          select: {
            id: true,
            title: true,
            folderId: true,
            folder: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`📊 Found ${comments.length} comments for task ${taskId}`);
    comments.forEach(comment => {
      console.log(`   - Comment ${comment.id}: ${comment.links?.length || 0} links, Folder: ${comment.task.folder?.name || 'None'}`);
    });

    res.json({ 
      comments,
      taskInfo: { // NEW: Return task context
        id: task.id,
        title: task.title,
        folder: task.folder
      }
    });
  } catch (error) {
    console.error("💥 Get comments error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Get comment by ID
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
        links: {
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
            folder: { // NEW: Include folder
              select: {
                id: true,
                name: true
              }
            },
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
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Get all comments for a project - UPDATED: Include folder context
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
        members: true,
        folders: { // NEW: Include folders for context
          select: {
            id: true,
            name: true
          }
        }
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
        links: {
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
            projectId: true,
            folderId: true, // NEW: Include folder info
            folder: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ 
      comments,
      projectInfo: { // NEW: Return project context
        id: project.id,
        name: project.name,
        folders: project.folders
      }
    });
  } catch (error) {
    console.error("Get project comments error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// NEW: Get all comments for a specific folder
export const getFolderComments = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { folderId } = req.params;

    if (!folderId) {
      return res.status(400).json({ message: "Folder ID is required." });
    }

    // Verify folder exists and user has access
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
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

    if (!folder) {
      return res.status(404).json({ message: "Folder not found." });
    }

    // Check if user has access to the project
    const hasAccess = folder.project.members.some(member => member.userId === userId) ||
                     folder.project.workspace.members.some(member => member.userId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have access to view comments for this folder.",
      });
    }

    const comments = await prisma.comment.findMany({
      where: {
        task: {
          folderId: folderId
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
        links: {
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
            projectId: true,
            folderId: true,
            folder: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ 
      comments,
      folderInfo: {
        id: folder.id,
        name: folder.name,
        project: {
          id: folder.project.id,
          name: folder.project.name
        }
      }
    });
  } catch (error) {
    console.error("Get folder comments error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({ message: "Comment ID is required." });
    }

    // Find the comment - UPDATED: Include folder info
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            folder: { // NEW: Include folder
              select: {
                id: true,
                name: true
              }
            },
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

    console.log(`✅ Comment deleted: ${commentId} from task ${comment.task.id} in folder ${comment.task.folder?.name || 'None'}`);

    res.json({ 
      message: "Comment deleted successfully." 
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};