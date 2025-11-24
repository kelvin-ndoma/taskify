// controllers/taskController.js
import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// Create task
export const createTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const origin = req.get("origin");

    const {
      projectId,
      title,
      description,
      type = "GENERAL_TASK",
      status = "TODO",
      priority = "MEDIUM",
      assignees = [],
      due_date,
      links = [], // Array of { url, title } objects for task links
    } = req.body;

    // Validate required fields
    if (!projectId || !title) {
      return res.status(400).json({ message: "Project ID and title are required." });
    }

    // Validate enum values
    const validTaskTypes = ["GENERAL_TASK", "WEEKLY_EMAILS", "CALENDARS", "CLIENT", "SOCIAL", "OTHER"];
    const validTaskStatuses = ["TODO", "IN_PROGRESS", "INTERNAL_REVIEW", "DONE", "CANCELLED"];
    const validPriorities = ["LOW", "MEDIUM", "HIGH"];

    if (type && !validTaskTypes.includes(type)) {
      return res.status(400).json({ 
        message: `Invalid task type. Must be one of: ${validTaskTypes.join(", ")}` 
      });
    }

    if (status && !validTaskStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid task status. Must be one of: ${validTaskStatuses.join(", ")}` 
      });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ 
        message: `Invalid priority. Must be one of: ${validPriorities.join(", ")}` 
      });
    }

    // Check if user has admin role for project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { include: { user: true } },
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // Check permissions
    const isWorkspaceAdmin = project.workspace.members.some(
      (member) => member.userId === userId && member.role === "ADMIN"
    );
    const isProjectLead = project.team_lead === userId;
    const isProjectMember = project.members.some(
      (member) => member.userId === userId
    );

    if (!isWorkspaceAdmin && !isProjectLead && !isProjectMember) {
      return res.status(403).json({
        message: "You don't have permission to create tasks in this project.",
      });
    }

    // Validate assignees are project members
    if (assignees.length > 0) {
      const invalidAssignees = [];
      for (const assigneeId of assignees) {
        const isValidAssignee = project.members.some(
          (member) => member.userId === assigneeId
        );
        if (!isValidAssignee) {
          invalidAssignees.push(assigneeId);
        }
      }
      if (invalidAssignees.length > 0) {
        return res.status(400).json({
          message: `Some assignees are not project members: ${invalidAssignees.join(", ")}`,
        });
      }
    }

    // FIXED: Validate links - removed unique URL validation
    if (links && Array.isArray(links)) {
      for (const link of links) {
        if (!link.url) {
          return res.status(400).json({ message: "Link URL is required for all links." });
        }
        try {
          new URL(link.url); // Validate URL format only
        } catch (error) {
          return res.status(400).json({ message: `Invalid URL: ${link.url}` });
        }
      }
    }

    // Create task with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the task
      const task = await tx.task.create({
        data: {
          projectId,
          title,
          description,
          type,
          priority,
          status,
          due_date: due_date ? new Date(due_date) : null,
        },
      });

      // Create task assignees if provided
      if (assignees.length > 0) {
        await tx.taskAssignee.createMany({
          data: assignees.map((assigneeId) => ({
            taskId: task.id,
            userId: assigneeId,
          })),
        });
      }

      // FIXED: Create task links if provided - allow multiple links
      if (links && links.length > 0) {
        await tx.taskLink.createMany({
          data: links.map((link) => ({
            url: link.url,
            title: link.title || null,
            taskId: task.id,
            userId: userId,
          })),
        });
      }

      // Return task with full details including links - ENHANCED
      return await tx.task.findUnique({
        where: { id: task.id },
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
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
          project: {
            select: {
              id: true,
              name: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            },
          },
          // FIXED: Include comments count for better display
          _count: {
            select: {
              comments: true
            }
          }
        },
      });
    });

    console.log(`✅ Task created: ${result.id} with ${result.assignees.length} assignees and ${result.links.length} links`);

    // Send individual email events for each assignee
    if (result.assignees && result.assignees.length > 0) {
      const emailPromises = result.assignees.map(async (assignee) => {
        try {
          await inngest.send({
            name: "app/task.assigned",
            data: {
              taskId: result.id,
              assigneeId: assignee.user.id,
              origin: origin || process.env.FRONTEND_URL || "http://localhost:3000",
            },
          });
          console.log(`✅ Triggered email event for assignee: ${assignee.user.email}`);
          return { success: true, email: assignee.user.email };
        } catch (eventError) {
          console.error(`❌ Failed to trigger event for assignee ${assignee.user.id}:`, eventError);
          return { success: false, email: assignee.user.email, error: eventError.message };
        }
      });

      const emailResults = await Promise.allSettled(emailPromises);
      const successful = emailResults.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      const failed = emailResults.length - successful;
      
      if (failed > 0) {
        console.warn(`⚠️ ${failed} email events failed to trigger for task ${result.id}`);
      }
    }

    res.status(201).json({ 
      task: result, 
      message: "Task created successfully." 
    });
  } catch (error) {
    console.error("❌ Error creating task:", error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "A task with similar details already exists." });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "Related record not found." });
    }
    
    res.status(500).json({ 
      message: error.message || "Internal server error while creating task." 
    });
  }
};

// Update task
export const updateTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const origin = req.get("origin");
    const { id: taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: {
          include: {
            user: true,
          },
        },
        links: true,
        project: {
          include: {
            workspace: {
              include: {
                members: true,
              },
            },
            members: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const {
      title,
      description,
      type,
      status,
      priority,
      assignees,
      due_date,
      links,
    } = req.body;

    // Validate enum values if provided
    const validTaskTypes = ["GENERAL_TASK", "WEEKLY_EMAILS", "CALENDARS", "CLIENT", "SOCIAL", "OTHER"];
    const validTaskStatuses = ["TODO", "IN_PROGRESS", "INTERNAL_REVIEW", "DONE", "CANCELLED"];
    const validPriorities = ["LOW", "MEDIUM", "HIGH"];

    if (type && !validTaskTypes.includes(type)) {
      return res.status(400).json({ 
        message: `Invalid task type. Must be one of: ${validTaskTypes.join(", ")}` 
      });
    }

    if (status && !validTaskStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid task status. Must be one of: ${validTaskStatuses.join(", ")}` 
      });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ 
        message: `Invalid priority. Must be one of: ${validPriorities.join(", ")}` 
      });
    }

    // Check permissions
    const isWorkspaceAdmin = task.project.workspace.members.some(
      (member) => member.userId === userId && member.role === "ADMIN"
    );
    const isProjectLead = task.project.team_lead === userId;
    const isTaskAssignee = task.assignees.some(
      (assignee) => assignee.user.id === userId
    );

    if (!isWorkspaceAdmin && !isProjectLead && !isTaskAssignee) {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this task." });
    }

    // Validate new assignees if provided
    if (assignees && assignees.length > 0) {
      const invalidAssignees = [];
      for (const assigneeId of assignees) {
        const isValidAssignee = task.project.members.some(
          (member) => member.userId === assigneeId
        );
        if (!isValidAssignee) {
          invalidAssignees.push(assigneeId);
        }
      }
      if (invalidAssignees.length > 0) {
        return res.status(400).json({
          message: `Some assignees are not project members: ${invalidAssignees.join(
            ", "
          )}`,
        });
      }
    }

    // FIXED: Validate links - removed unique URL validation
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

    // Track if status changed for email notification
    const statusChanged = status && status !== task.status;

    // Update task with transaction
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Update basic task fields
      const taskUpdate = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(type && { type }),
          ...(status && { status }),
          ...(priority && { priority }),
          ...(due_date && { due_date: new Date(due_date) }),
          updatedAt: new Date(),
        },
      });

      // FIXED: Update task links - allow multiple links
      if (links !== undefined) {
        // Delete all existing links for this task
        await tx.taskLink.deleteMany({
          where: { taskId: taskId }
        });

        // Create new links
        if (links.length > 0) {
          await tx.taskLink.createMany({
            data: links.map((link) => ({
              url: link.url,
              title: link.title || null,
              taskId: taskId,
              userId: userId,
            })),
          });
        }
      }

      // Update assignees if provided
      if (assignees !== undefined) {
        const currentAssigneeIds = task.assignees.map((a) => a.user.id);
        const newAssigneeIds = assignees;

        const assigneesToRemove = currentAssigneeIds.filter(
          (id) => !newAssigneeIds.includes(id)
        );

        const assigneesToAdd = newAssigneeIds.filter(
          (id) => !currentAssigneeIds.includes(id)
        );

        if (assigneesToRemove.length > 0) {
          await tx.taskAssignee.deleteMany({
            where: {
              taskId: taskId,
              userId: { in: assigneesToRemove },
            },
          });
        }

        if (assigneesToAdd.length > 0) {
          await tx.taskAssignee.createMany({
            data: assigneesToAdd.map((userId) => ({
              taskId: taskId,
              userId: userId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Return updated task with full details including links - ENHANCED
      return await tx.task.findUnique({
        where: { id: taskId },
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
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
          project: {
            select: {
              id: true,
              name: true,
              workspace: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
          },
          _count: {
            select: {
              comments: true
            }
          }
        },
      });
    });

    console.log(`✅ Task updated: ${updatedTask.id} with ${updatedTask.links.length} links`);

    // Trigger email events for status changes
    if (statusChanged) {
      try {
        await inngest.send({
          name: "app/task.status.updated",
          data: {
            taskId: taskId,
            oldStatus: task.status,
            newStatus: status,
            updaterId: userId,
            origin: origin || process.env.FRONTEND_URL || "http://localhost:3000",
          },
        });
        console.log(`✅ Triggered status update event for task ${taskId}`);
      } catch (eventError) {
        console.error(`❌ Failed to trigger status update event for task ${taskId}:`, eventError);
      }
    }

    // Trigger email events for new assignees
    if (assignees !== undefined) {
      const currentAssigneeIds = task.assignees.map((a) => a.user.id);
      const newAssigneeIds = assignees;
      const assigneesToAdd = newAssigneeIds.filter(
        (id) => !currentAssigneeIds.includes(id)
      );

      if (assigneesToAdd.length > 0) {
        for (const newAssigneeId of assigneesToAdd) {
          try {
            await inngest.send({
              name: "app/task.assigned",
              data: {
                taskId: taskId,
                assigneeId: newAssigneeId,
                origin: origin || process.env.FRONTEND_URL || "http://localhost:3000",
              },
            });
            console.log(`✅ Triggered email event for new assignee: ${newAssigneeId}`);
          } catch (eventError) {
            console.error(`❌ Failed to trigger event for new assignee ${newAssigneeId}:`, eventError);
          }
        }
      }
    }

    res.json({ task: updatedTask, message: "Task updated successfully." });
  } catch (error) {
    console.error("❌ Error updating task:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Get task by ID - ENHANCED for better display
export const getTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id: taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
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
        project: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
            members: {
              where: { userId },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
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
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        // FIXED: Include counts for better display
        _count: {
          select: {
            comments: true,
            assignees: true,
            links: true
          }
        }
      },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    // Check if user has access to this task
    const hasWorkspaceAccess = task.project.workspace.members.length > 0;
    const hasProjectAccess = task.project.members.length > 0;
    const isTaskAssignee = task.assignees.some(
      (assignee) => assignee.user.id === userId
    );

    if (!hasWorkspaceAccess && !hasProjectAccess && !isTaskAssignee) {
      return res.status(403).json({
        message: "You don't have access to this task.",
      });
    }

    res.json({ task });
  } catch (error) {
    console.error("❌ Error fetching task:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Get tasks by project - ENHANCED for better display
export const getProjectTasks = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
        members: {
          where: { userId },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // Check if user has access to this project
    const hasWorkspaceAccess = project.workspace.members.length > 0;
    const hasProjectAccess = project.members.length > 0;

    if (!hasWorkspaceAccess && !hasProjectAccess) {
      return res.status(403).json({
        message: "You don't have access to this project's tasks.",
      });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
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
        comments: {
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
        // FIXED: Include counts for better display
        _count: {
          select: {
            comments: true,
            assignees: true
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ tasks });
  } catch (error) {
    console.error("❌ Error fetching project tasks:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Delete single task by ID
export const deleteTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id: taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    // Check permissions - only project lead or workspace admin can delete
    const isProjectLead = task.project.team_lead === userId;
    const isWorkspaceAdmin = task.project.workspace.members.some(
      (member) => member.userId === userId && member.role === "ADMIN"
    );

    if (!isProjectLead && !isWorkspaceAdmin) {
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this task." });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    console.log(`✅ Deleted task: ${taskId} from project: ${task.project.id}`);

    res.json({
      message: "Task deleted successfully.",
      taskId: taskId,
    });
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Delete multiple tasks (bulk deletion)
export const deleteTasks = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { tasksIds } = req.body;

    if (!tasksIds || !Array.isArray(tasksIds) || tasksIds.length === 0) {
      return res.status(400).json({ message: "tasksIds array is required." });
    }

    const tasks = await prisma.task.findMany({
      where: { id: { in: tasksIds } },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found." });
    }

    // Check if all tasks belong to the same project
    const projectIds = [...new Set(tasks.map((task) => task.projectId))];
    if (projectIds.length > 1) {
      return res
        .status(400)
        .json({ message: "All tasks must belong to the same project." });
    }

    const project = tasks[0].project;

    // Check permissions - only project lead or workspace admin can delete
    const isProjectLead = project.team_lead === userId;
    const isWorkspaceAdmin = project.workspace.members.some(
      (member) => member.userId === userId && member.role === "ADMIN"
    );

    if (!isProjectLead && !isWorkspaceAdmin) {
      return res
        .status(403)
        .json({
          message:
            "You don't have permission to delete tasks from this project.",
        });
    }

    await prisma.task.deleteMany({
      where: { id: { in: tasksIds } },
    });

    console.log(
      `✅ Deleted ${tasksIds.length} tasks from project: ${project.id}`
    );

    res.json({
      message: `${tasksIds.length} task(s) deleted successfully.`,
      deletedCount: tasksIds.length,
    });
  } catch (error) {
    console.error("❌ Error deleting tasks:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};