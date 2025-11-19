// src/controllers/projectController.js
import prisma from "../configs/prisma.js";

// Helper function to check workspace admin/owner access
const hasWorkspaceAdminAccess = (workspace, userId) => {
  const isAdmin = workspace.members.some(
    (member) => member.userId === userId && member.role === "ADMIN"
  );
  const isOwner = workspace.ownerId === userId;
  return isAdmin || isOwner;
};

// Get all projects for current workspace
export const getProjects = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required." });
    }

    // Verify user has access to the workspace
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

    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
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
        },
        tasks: {
          include: {
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Create project
export const createProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const {
      workspaceId,
      description,
      name,
      status,
      start_date,
      end_date,
      team_members = [],
      team_lead,
      progress = 0,
      priority = "MEDIUM",
    } = req.body;

    if (!workspaceId || !name) {
      return res.status(400).json({ 
        message: "Workspace ID and project name are required." 
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { 
        members: { 
          include: { user: true } 
        } 
      },
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // UPDATED: Check for ADMIN role OR workspace ownership
    if (!hasWorkspaceAdminAccess(workspace, userId)) {
      return res.status(403).json({
        message: "You don't have permission to create projects in this workspace.",
      });
    }

    // Resolve team lead
    let teamLeadId;
    if (team_lead) {
      if (team_lead.includes('@')) {
        const teamLeadUser = await prisma.user.findUnique({
          where: { email: team_lead }
        });
        if (!teamLeadUser) {
          return res.status(404).json({ message: "Team lead user not found." });
        }
        teamLeadId = teamLeadUser.id;
      } else {
        teamLeadId = team_lead;
      }

      const isTeamLeadInWorkspace = workspace.members.some(
        member => member.userId === teamLeadId
      );
      if (!isTeamLeadInWorkspace) {
        return res.status(400).json({ 
          message: "Team lead must be a member of the workspace." 
        });
      }
    } else {
      teamLeadId = userId;
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        status: status || "ACTIVE",
        priority: priority || "MEDIUM",
        progress: progress || 0,
        team_lead: teamLeadId,
        workspaceId,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
      },
    });

    // Add members to project
    const membersToAdd = [];
    
    if (!membersToAdd.includes(teamLeadId)) {
      membersToAdd.push(teamLeadId);
    }

    if (team_members.length > 0) {
      for (const memberIdentifier of team_members) {
        let memberId;
        
        if (memberIdentifier.includes('@')) {
          const user = await prisma.user.findUnique({
            where: { email: memberIdentifier }
          });
          if (user) memberId = user.id;
        } else {
          memberId = memberIdentifier;
        }

        if (memberId && 
            workspace.members.some(m => m.userId === memberId) && 
            !membersToAdd.includes(memberId)) {
          membersToAdd.push(memberId);
        }
      }
    }

    if (membersToAdd.length > 0) {
      await prisma.projectMember.createMany({
        data: membersToAdd.map((memberId) => ({
          projectId: project.id,
          userId: memberId,
        })),
        skipDuplicates: true,
      });
    }

    const projectWithDetails = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
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
        },
        tasks: {
          include: {
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            comments: { 
              include: { 
                user:{
                  select: {
                    id: true,
                    name: true,
                    image: true
                  }
                } 
              } 
            },
          },
        },
      },
    });

    res.json({
      project: projectWithDetails,
      message: "Project created successfully.",
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Get project by ID
export const getProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
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
        },
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const hasAccess = project.members.some(member => member.userId === userId) ||
                     project.workspace.members.some(member => member.userId === userId);

    if (!hasAccess) {
      return res.status(403).json({ 
        message: "You don't have access to this project." 
      });
    }

    res.json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Update project
export const updateProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;
    const {
      description,
      name,
      status,
      start_date,
      end_date,
      progress,
      priority,
      team_lead,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required." });
    }

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

    // UPDATED: Check permissions - workspace admin/owner OR project team lead
    const hasAdminAccess = hasWorkspaceAdminAccess(project.workspace, userId);
    const isProjectLead = project.team_lead === userId;

    if (!hasAdminAccess && !isProjectLead) {
      return res.status(403).json({
        message: "You don't have permission to update this project.",
      });
    }

    let teamLeadId = project.team_lead;
    if (team_lead) {
      const isNewLeadInWorkspace = project.workspace.members.some(
        member => member.userId === team_lead
      );
      
      if (!isNewLeadInWorkspace) {
        return res.status(400).json({ 
          message: "New team lead must be a member of the workspace." 
        });
      }
      teamLeadId = team_lead;
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(progress !== undefined && { progress }),
        ...(team_lead && { team_lead: teamLeadId }),
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
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
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    res.json({ 
      project: updatedProject, 
      message: "Project updated successfully." 
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Delete project
export const deleteProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required." });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            members: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // UPDATED: Check permissions - workspace admin/owner OR project team lead
    const hasAdminAccess = hasWorkspaceAdminAccess(project.workspace, userId);
    const isProjectLead = project.team_lead === userId;

    if (!hasAdminAccess && !isProjectLead) {
      return res.status(403).json({
        message: "You don't have permission to delete this project.",
      });
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    res.json({ 
      message: "Project deleted successfully.",
      projectId 
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Add member to project
export const addProjectMember = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        workspace: {
          include: {
            members: true
          }
        },
        members: { 
          include: { user: true } 
        } 
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // UPDATED: Check permissions - workspace admin/owner OR project team lead
    const hasAdminAccess = hasWorkspaceAdminAccess(project.workspace, userId);
    const isProjectLead = project.team_lead === userId;

    if (!isProjectLead && !hasAdminAccess) {
      return res.status(403).json({ 
        message: "Only the project lead or workspace admin/owner can add members." 
      });
    }

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: {
        workspaces: {
          where: {
            workspaceId: project.workspaceId
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.workspaces.length === 0) {
      return res.status(400).json({ 
        message: "User must be a member of the workspace first." 
      });
    }

    const existingMember = project.members.find(
      (member) => member.userId === user.id
    );

    if (existingMember) {
      return res.status(400).json({ message: "User is already a project member." });
    }

    const member = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId,
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

    res.json({ 
      member, 
      message: "Member added to project successfully." 
    });
  } catch (error) {
    console.error("Add project member error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Remove member from project
export const removeProjectMember = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId, memberId } = req.params;

    if (!projectId || !memberId) {
      return res.status(400).json({ 
        message: "Project ID and Member ID are required." 
      });
    }

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

    // UPDATED: Check permissions - workspace admin/owner OR project team lead
    const hasAdminAccess = hasWorkspaceAdminAccess(project.workspace, userId);
    const isProjectLead = project.team_lead === userId;

    if (!hasAdminAccess && !isProjectLead) {
      return res.status(403).json({ 
        message: "Only the project lead or workspace admin/owner can remove members." 
      });
    }

    if (memberId === project.team_lead) {
      return res.status(400).json({ 
        message: "Cannot remove project lead from project." 
      });
    }

    const memberToRemove = project.members.find(
      (member) => member.userId === memberId
    );

    if (!memberToRemove) {
      return res.status(404).json({ 
        message: "Member not found in project." 
      });
    }

    await prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId: memberId,
          projectId: projectId
        }
      }
    });

    await prisma.taskAssignee.deleteMany({
      where: {
        userId: memberId,
        task: {
          projectId: projectId
        }
      }
    });

    res.json({ 
      message: "Member removed from project successfully.",
      removedMember: memberToRemove
    });
  } catch (error) {
    console.error("Remove project member error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Get project statistics
export const getProjectStats = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          include: {
            assignees: true
          }
        },
        members: true,
        workspace: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const hasAccess = project.members.some(member => member.userId === userId) ||
                     project.workspace.members.length > 0;

    if (!hasAccess) {
      return res.status(403).json({ 
        message: "You don't have access to this project." 
      });
    }

    const stats = {
      totalTasks: project.tasks.length,
      completedTasks: project.tasks.filter(task => task.status === 'DONE').length,
      inProgressTasks: project.tasks.filter(task => task.status === 'IN_PROGRESS').length,
      todoTasks: project.tasks.filter(task => task.status === 'TODO').length,
      internalReviewTasks: project.tasks.filter(task => task.status === 'INTERNAL_REVIEW').length,
      cancelledTasks: project.tasks.filter(task => task.status === 'CANCELLED').length,
      totalMembers: project.members.length,
      progress: project.progress,
      overdueTasks: project.tasks.filter(task => 
        task.due_date && new Date(task.due_date) < new Date() && 
        task.status !== 'DONE' && task.status !== 'CANCELLED'
      ).length
    };

    res.json({ stats });
  } catch (error) {
    console.error("Get project stats error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Update project progress
export const updateProjectProgress = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;
    const { progress } = req.body;

    if (!projectId || progress === undefined) {
      return res.status(400).json({ 
        message: "Project ID and progress are required." 
      });
    }

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ 
        message: "Progress must be between 0 and 100." 
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            members: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // UPDATED: Check permissions - workspace admin/owner OR project team lead
    const hasAdminAccess = hasWorkspaceAdminAccess(project.workspace, userId);
    const isProjectLead = project.team_lead === userId;

    if (!hasAdminAccess && !isProjectLead) {
      return res.status(403).json({
        message: "You don't have permission to update this project's progress.",
      });
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { progress },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
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
    });

    res.json({ 
      project: updatedProject, 
      message: "Project progress updated successfully." 
    });
  } catch (error) {
    console.error("Update project progress error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};