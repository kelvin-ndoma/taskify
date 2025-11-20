// src/controllers/workspaceController.js
import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js"; // Make sure to import inngest

// Get all workspaces for User
export const getUserWorkspaces = async (req, res) => {
  try {
    const { userId } = await req.auth();

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        projects: {
          include: {
            tasks: {
              include: {
                assignees: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true },
                    },
                  },
                },
                comments: {
                  include: {
                    user: {
                      select: { id: true, name: true, image: true },
                    },
                  },
                },
              },
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ workspaces });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Add member to workspace (with default workspace enforcement)
export const addMember = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { email, role, message } = req.body; // ✅ REMOVED workspaceId from body
    const { workspaceId } = req.params; // ✅ FIXED: Get workspaceId from URL params

    console.log('🎯 addMember function called:', {
      params: req.params,
      body: req.body,
      workspaceIdFromParams: req.params.workspaceId,
      authUserId: userId
    });

    if (!email || !role || !workspaceId) {
      return res.status(400).json({ 
        message: "Missing required fields: email, role" 
      });
    }

    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Get or create user
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ 
        message: "User not found. They must sign up first before being invited to workspaces." 
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true, owner: true },
    });
    
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check permissions
    const isAdmin = workspace.members.some(
      (m) => m.userId === userId && m.role === "ADMIN"
    );
    const isOwner = workspace.ownerId === userId;
    
    if (!isAdmin && !isOwner) {
      return res
        .status(403)
        .json({ message: "You don't have permission to add members" });
    }

    // Check if user is already in this workspace
    const existingMember = workspace.members.find((m) => m.userId === user.id);
    if (existingMember) {
      return res
        .status(400)
        .json({ message: "User is already a member of this workspace" });
    }

    // 🔥 CRITICAL: Ensure user is in default workspace first
    const defaultWorkspace = await prisma.workspace.findFirst({
      where: { 
        OR: [
          { slug: "the-burns-brothers" },
          { name: "The Burns Brothers" }
        ]
      },
    });

    if (!defaultWorkspace) {
      return res.status(500).json({ message: "Default workspace not found" });
    }

    // Check if user is in default workspace, if not add them
    const defaultWorkspaceMembership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: defaultWorkspace.id,
        },
      },
    });

    let addedToDefault = false;
    if (!defaultWorkspaceMembership) {
      console.log(`➕ Adding user ${user.email} to default workspace first`);
      await prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: defaultWorkspace.id,
          role: "MEMBER",
          message: "Auto-added via workspace invitation",
        },
      });
      addedToDefault = true;
      console.log(`✅ User ${user.email} added to The Burns Brothers workspace`);
    } else {
      console.log(`ℹ️ User ${user.email} already in default workspace`);
    }

    // Now add user to the target workspace
    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role,
        message: message || `Invited to ${workspace.name}`,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    console.log(`✅ User ${user.email} added to workspace ${workspace.name}`);

    // ✅ Trigger email invitation
    try {
      // Get current user's name for the invitation
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      await inngest.send({
        name: "app/workspace.invitation",
        data: {
          workspaceId,
          inviteeEmail: email,
          inviterName: currentUser?.name || "Team Member",
          origin: process.env.FRONTEND_URL || "https://www.tbbasco.com",
          role
        }
      });
      console.log(`📧 Invitation email triggered for ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to trigger invitation email:', emailError);
      // Don't fail the whole request if email fails
    }

    res.json({ 
      member, 
      addedToDefault,
      message: "Member added successfully. User has been automatically added to The Burns Brothers workspace." 
    });
  } catch (error) {
    console.error("Error adding member:", error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: "User is already a member of this workspace" 
      });
    }
    
    res.status(500).json({ 
      message: error.message || "Failed to add member to workspace" 
    });
  }
};

// Remove member from workspace
export const removeMember = async (req, res) => {
  try {
    const { userId: currentUserId } = await req.auth();
    const { workspaceId, userId } = req.params;

    // Validate input
    if (!workspaceId || !userId) {
      return res.status(400).json({ 
        message: "Workspace ID and User ID are required" 
      });
    }

    // Get workspace with members and owner info
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { 
        members: {
          include: { 
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if current user is admin or owner
    const currentUserMembership = workspace.members.find(m => m.userId === currentUserId);
    const isAdmin = currentUserMembership?.role === 'ADMIN';
    const isOwner = workspace.ownerId === currentUserId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        message: "Only workspace admins or owners can remove members" 
      });
    }

    // Prevent removing workspace owner
    if (userId === workspace.ownerId) {
      return res.status(400).json({ 
        message: "Cannot remove workspace owner" 
      });
    }

    // Prevent removing yourself
    if (userId === currentUserId) {
      return res.status(400).json({ 
        message: "Cannot remove yourself from workspace" 
      });
    }

    // Find the member to remove
    const memberToRemove = workspace.members.find(m => m.userId === userId);
    if (!memberToRemove) {
      return res.status(404).json({ 
        message: "User is not a member of this workspace" 
      });
    }

    // Remove member from all projects in this workspace first
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: { members: true }
    });

    // Remove user from all project memberships in this workspace
    for (const project of projects) {
      const projectMembership = project.members.find(m => m.userId === userId);
      if (projectMembership) {
        await prisma.projectMember.delete({
          where: { 
            userId_projectId: { 
              userId, 
              projectId: project.id 
            } 
          }
        });
      }
    }

    // Remove user from task assignments in this workspace
    const tasks = await prisma.task.findMany({
      where: {
        project: { workspaceId }
      },
      include: { assignees: true }
    });

    for (const task of tasks) {
      const taskAssignment = task.assignees.find(a => a.userId === userId);
      if (taskAssignment) {
        await prisma.taskAssignee.delete({
          where: { 
            taskId_userId: { 
              taskId: task.id, 
              userId 
            } 
          }
        });
      }
    }

    // Finally, remove member from workspace
    await prisma.workspaceMember.delete({
      where: { 
        userId_workspaceId: { 
          userId, 
          workspaceId 
        } 
      }
    });

    console.log(`✅ Member ${userId} removed from workspace ${workspaceId} by ${currentUserId}`);

    res.json({ 
      message: "Member removed successfully",
      removedMember: {
        id: memberToRemove.id,
        user: memberToRemove.user,
        role: memberToRemove.role
      }
    });

  } catch (error) {
    console.error("Error removing workspace member:", error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        message: "Member not found in workspace" 
      });
    }
    
    res.status(500).json({ 
      message: error.message || "Failed to remove member from workspace" 
    });
  }
};

// Delete a workspace (only owner or admin)
export const deleteWorkspace = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const isOwner = workspace.ownerId === userId;
    const isAdmin = workspace.members.some(
      (m) => m.userId === userId && m.role === "ADMIN"
    );
    if (!isOwner && !isAdmin)
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this workspace" });

    await prisma.workspace.delete({ where: { id: workspaceId } });
    res.json({ message: "Workspace deleted successfully", workspaceId });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    res.status(500).json({ message: error.message || "Failed to delete workspace" });
  }
};

// Update workspace
export const updateWorkspace = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId } = req.params;
    const { name, description, settings } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required" });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check permissions - only owner or admin can update
    const isOwner = workspace.ownerId === userId;
    const isAdmin = workspace.members.some(
      (m) => m.userId === userId && m.role === "ADMIN"
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "You don't have permission to update this workspace",
      });
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(settings && { settings }),
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      workspace: updatedWorkspace,
      message: "Workspace updated successfully",
    });
  } catch (error) {
    console.error("Error updating workspace:", error);
    res.status(500).json({ message: error.message || "Failed to update workspace" });
  }
};

// Get workspace by ID
export const getWorkspaceById = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        projects: {
          include: {
            tasks: {
              include: {
                assignees: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true },
                    },
                  },
                },
              },
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if user is a member of this workspace
    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({
        message: "You don't have access to this workspace",
      });
    }

    res.json({ workspace });
  } catch (error) {
    console.error("Error fetching workspace:", error);
    res.status(500).json({ message: error.message || "Failed to fetch workspace" });
  }
};

// Update member role
export const updateMemberRole = async (req, res) => {
  try {
    const { userId: currentUserId } = await req.auth();
    const { workspaceId, userId } = req.params;
    const { role } = req.body;

    if (!workspaceId || !userId || !role) {
      return res.status(400).json({
        message: "Workspace ID, User ID, and role are required",
      });
    }

    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true, owner: true },
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if current user is owner (only owner can change roles)
    const isOwner = workspace.ownerId === currentUserId;
    if (!isOwner) {
      return res.status(403).json({
        message: "Only workspace owner can change member roles",
      });
    }

    // Prevent changing owner's role
    if (userId === workspace.ownerId) {
      return res.status(400).json({
        message: "Cannot change workspace owner's role",
      });
    }

    const memberToUpdate = workspace.members.find((m) => m.userId === userId);
    if (!memberToUpdate) {
      return res.status(404).json({
        message: "User is not a member of this workspace",
      });
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    res.json({
      member: updatedMember,
      message: "Member role updated successfully",
    });
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({
      message: error.message || "Failed to update member role",
    });
  }
};

// ✅ FIXED: ensureDefaultWorkspace function - handles missing users
export const ensureDefaultWorkspace = async (userId) => {
  try {
    console.log(`🔄 ensureDefaultWorkspace called with userId: ${userId}`);
    
    const defaultWorkspaceSlug = "the-burns-brothers";
    const defaultWorkspaceName = "The Burns Brothers";

    // First, verify the user exists - CREATE IF NOT EXISTS
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.warn(`⚠️ User ${userId} not found in database, creating user...`);
      
      // Create the user with minimal data
      user = await prisma.user.create({
        data: {
          id: userId,
          name: "New User",
          email: `${userId}@temp.com`, // Temporary email
          image: "",
        },
      });
      console.log(`✅ Created new user: ${user.id}`);
    }

    // Find the default workspace by slug OR name
    const workspace = await prisma.workspace.findFirst({
      where: { 
        OR: [
          { slug: defaultWorkspaceSlug },
          { name: defaultWorkspaceName }
        ]
      },
    });

    if (!workspace) {
      console.error(`❌ Default workspace not found in database`);
      return null;
    }

    console.log(`✅ Found default workspace: ${workspace.name} (ID: ${workspace.id})`);

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: workspace.id },
      },
    });

    if (!existingMember) {
      console.log(`➕ Adding user ${userId} to workspace as MEMBER`);
      await prisma.workspaceMember.create({
        data: {
          userId,
          workspaceId: workspace.id,
          role: "MEMBER",
          message: "Auto-joined default workspace",
        },
      });
      console.log(`✅ User ${userId} joined The Burns Brothers`);
    } else {
      console.log(`ℹ️ User ${userId} already in default workspace as ${existingMember.role}`);
    }

    // Return the workspace object directly
    return workspace;
  } catch (error) {
    console.error("❌ Error in ensureDefaultWorkspace:", error);
    
    if (error.code === 'P2002') {
      console.log('ℹ️ User already exists in workspace (unique constraint)');
      // Try to return the workspace anyway
      const workspace = await prisma.workspace.findFirst({
        where: { 
          OR: [
            { slug: "the-burns-brothers" },
            { name: "The Burns Brothers" }
          ]
        },
      });
      return workspace;
    }
    
    return null;
  }
};

// Create user and auto-join default workspace
export const createUserWithDefaultWorkspace = async (userData) => {
  try {
    const user = await prisma.user.create({ data: userData });
    await ensureDefaultWorkspace(user.id);
    return user;
  } catch (error) {
    console.error("Error creating user with default workspace:", error);
    throw error;
  }
};