// controllers/teamController.js
import prisma from "../configs/prisma.js";

// Get all tasks assigned to a specific team member in a workspace
export const getMemberTasks = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId, memberId } = req.params;

    console.log("📥 Fetching tasks for member:", { workspaceId, memberId, requestedBy: userId });

    // Verify workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId }
        }
      }
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found." });
    }

    if (workspace.members.length === 0) {
      return res.status(403).json({ 
        message: "You don't have access to this workspace." 
      });
    }

    // Verify the target member is actually in this workspace
    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: memberId
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
      }
    });

    if (!targetMember) {
      return res.status(404).json({ 
        message: "Team member not found in this workspace." 
      });
    }

    // Get all tasks assigned to this member across all projects in the workspace
    const tasks = await prisma.task.findMany({
      where: {
        assignees: {
          some: {
            userId: memberId
          }
        },
        project: {
          workspaceId: workspaceId
        }
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
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            workspaceId: true
          }
        },
        folder: {
          select: {
            id: true,
            name: true,
            description: true
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
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Get only the latest comment for preview
        },
        _count: {
          select: {
            comments: true,
            assignees: true,
            links: true
          }
        }
      },
      orderBy: [
        { projectId: 'asc' },
        { folderId: 'asc' },
        { position: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    console.log(`✅ Found ${tasks.length} tasks for member ${targetMember.user.name}`);

    res.json({ 
      tasks,
      member: {
        id: targetMember.user.id,
        name: targetMember.user.name,
        email: targetMember.user.email,
        image: targetMember.user.image,
        role: targetMember.role
      }
    });
  } catch (error) {
    console.error("❌ Error fetching member tasks:", error);
    res.status(500).json({ 
      message: error.message || "Internal server error while fetching member tasks" 
    });
  }
};

// Get team member statistics
export const getMemberStats = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId, memberId } = req.params;

    // Verify workspace access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId }
        }
      }
    });

    if (!workspace || workspace.members.length === 0) {
      return res.status(403).json({ 
        message: "You don't have access to this workspace." 
      });
    }

    // Get task counts by status for this member
    const taskCounts = await prisma.task.aggregate({
      where: {
        assignees: {
          some: {
            userId: memberId
          }
        },
        project: {
          workspaceId: workspaceId
        }
      },
      _count: {
        id: true
      }
    });

    const statusCounts = await prisma.task.groupBy({
      by: ['status'],
      where: {
        assignees: {
          some: {
            userId: memberId
          }
        },
        project: {
          workspaceId: workspaceId
        }
      },
      _count: {
        id: true
      }
    });

    const overdueTasks = await prisma.task.count({
      where: {
        assignees: {
          some: {
            userId: memberId
          }
        },
        project: {
          workspaceId: workspaceId
        },
        due_date: {
          lt: new Date()
        },
        status: {
          notIn: ['DONE', 'CANCELLED']
        }
      }
    });

    // Transform status counts into a more usable format
    const statusStats = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {});

    const stats = {
      totalTasks: taskCounts._count.id,
      todo: statusStats.TODO || 0,
      inProgress: statusStats.IN_PROGRESS || 0,
      inReview: statusStats.INTERNAL_REVIEW || 0,
      done: statusStats.DONE || 0,
      cancelled: statusStats.CANCELLED || 0,
      overdue: overdueTasks
    };

    res.json({ stats });
  } catch (error) {
    console.error("❌ Error fetching member stats:", error);
    res.status(500).json({ 
      message: error.message || "Internal server error while fetching member stats" 
    });
  }
};

// Get all team members with their task counts
export const getWorkspaceTeamMembers = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId } = req.params;

    // Verify workspace access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId }
        }
      }
    });

    if (!workspace || workspace.members.length === 0) {
      return res.status(403).json({ 
        message: "You don't have access to this workspace." 
      });
    }

    // Get all workspace members with their task counts
    const membersWithStats = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: workspaceId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            // Count tasks where this user is an assignee in this workspace
            user: {
              select: {
                assignedTasks: {
                  where: {
                    task: {
                      project: {
                        workspaceId: workspaceId
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        {
          role: 'desc' // ADMIN first
        },
        {
          user: {
            name: 'asc'
          }
        }
      ]
    });

    // Transform the data to include task counts
    const members = await Promise.all(
      membersWithStats.map(async (member) => {
        const taskCount = await prisma.taskAssignee.count({
          where: {
            userId: member.userId,
            task: {
              project: {
                workspaceId: workspaceId
              }
            }
          }
        });

        const completedTasks = await prisma.taskAssignee.count({
          where: {
            userId: member.userId,
            task: {
              project: {
                workspaceId: workspaceId
              },
              status: 'DONE'
            }
          }
        });

        return {
          id: member.id,
          userId: member.userId,
          role: member.role,
          user: member.user,
          taskCount,
          completedTasks,
          completionRate: taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0
        };
      })
    );

    res.json({ members });
  } catch (error) {
    console.error("❌ Error fetching workspace team members:", error);
    res.status(500).json({ 
      message: error.message || "Internal server error while fetching team members" 
    });
  }
};