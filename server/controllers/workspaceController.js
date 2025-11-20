// src/controllers/workspaceController.js
import prisma from "../configs/prisma.js";

// Constants for default workspace
const DEFAULT_WORKSPACE_NAME = "The Burns Brothers";
const DEFAULT_WORKSPACE_SLUG = "the-burns-brothers";

// Utility function for consistent error responses
const errorResponse = (res, status, message, error = null) => {
  console.error(`❌ ${message}:`, error);
  return res.status(status).json({ 
    message,
    ...(error && process.env.NODE_ENV === 'development' && { debug: error.message })
  });
};

// Utility function for success responses
const successResponse = (res, data, message = "Success") => {
  return res.json({ 
    success: true,
    message,
    ...data 
  });
};

// Get all workspaces for User
export const getUserWorkspaces = async (req, res) => {
  try {
    const { userId } = await req.auth();
    console.log(`📂 Fetching workspaces for user: ${userId}`);

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

    console.log(`✅ Found ${workspaces.length} workspaces for user ${userId}`);
    return successResponse(res, { workspaces }, "Workspaces retrieved successfully");

  } catch (error) {
    return errorResponse(res, 500, "Failed to fetch workspaces", error);
  }
};

// Enhanced add member to workspace with robust default workspace handling
export const addMember = async (req, res) => {
  try {
    const { userId: currentUserId } = await req.auth();
    const { workspaceId } = req.params; // From URL params
    const { email, role, message } = req.body; // From request body

    console.log(`👥 Add member request:`, {
      currentUserId,
      workspaceId,
      email,
      role,
      invitedBy: currentUserId
    });

    // Validate input
    if (!email || !role) {
      return errorResponse(res, 400, "Missing required fields: email and role");
    }

    if (!["ADMIN", "MEMBER"].includes(role)) {
      return errorResponse(res, 400, "Invalid role. Must be ADMIN or MEMBER");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(res, 400, "Invalid email format");
    }

    // Step 1: Find the target user
    console.log(`🔍 Looking up user with email: ${email}`);
    const targetUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    if (!targetUser) {
      console.log(`❌ User not found with email: ${email}`);
      return errorResponse(res, 404, 
        "User not found. They must sign up first before being invited to workspaces."
      );
    }

    console.log(`✅ Found user: ${targetUser.name} (${targetUser.id})`);

    // Step 2: Verify the target workspace exists
    console.log(`🔍 Verifying workspace: ${workspaceId}`);
    const targetWorkspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { 
        members: true, 
        owner: true 
      },
    });
    
    if (!targetWorkspace) {
      return errorResponse(res, 404, "Workspace not found");
    }

    console.log(`✅ Found workspace: ${targetWorkspace.name}`);

    // Step 3: Check if current user has permission to add members
    const isOwner = targetWorkspace.ownerId === currentUserId;
    const isAdmin = targetWorkspace.members.some(
      (m) => m.userId === currentUserId && m.role === "ADMIN"
    );
    
    if (!isOwner && !isAdmin) {
      return errorResponse(res, 403, 
        "You don't have permission to add members to this workspace"
      );
    }

    console.log(`✅ Permission verified: ${isOwner ? 'OWNER' : 'ADMIN'}`);

    // Step 4: Check if user is already in the target workspace
    const existingMembership = targetWorkspace.members.find(
      (m) => m.userId === targetUser.id
    );
    
    if (existingMembership) {
      return errorResponse(res, 400, 
        "User is already a member of this workspace"
      );
    }

    // Step 5: Handle default workspace membership
    console.log(`🏢 Handling default workspace membership...`);
    const defaultWorkspace = await getOrCreateDefaultWorkspace();
    
    if (!defaultWorkspace) {
      return errorResponse(res, 500, 
        "Default workspace not configured properly"
      );
    }

    const defaultWorkspaceMembership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUser.id,
          workspaceId: defaultWorkspace.id,
        },
      },
    });

    let addedToDefault = false;
    if (!defaultWorkspaceMembership) {
      console.log(`➕ Adding user to default workspace: ${defaultWorkspace.name}`);
      
      try {
        await prisma.workspaceMember.create({
          data: {
            userId: targetUser.id,
            workspaceId: defaultWorkspace.id,
            role: "MEMBER", // Always MEMBER for default workspace
            message: "Auto-added via workspace invitation system",
          },
        });
        addedToDefault = true;
        console.log(`✅ Successfully added user to default workspace`);
      } catch (error) {
        // Handle race condition where user might have been added by another process
        if (error.code === 'P2002') {
          console.log(`ℹ️ User already in default workspace (race condition)`);
        } else {
          throw error;
        }
      }
    } else {
      console.log(`ℹ️ User already in default workspace as ${defaultWorkspaceMembership.role}`);
    }

    // Step 6: Add user to target workspace
    console.log(`➕ Adding user to target workspace: ${targetWorkspace.name}`);
    const newMember = await prisma.workspaceMember.create({
      data: {
        userId: targetUser.id,
        workspaceId: targetWorkspace.id,
        role,
        message: message || `Invited to ${targetWorkspace.name} by user ${currentUserId}`,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    console.log(`🎉 Successfully added ${targetUser.email} to ${targetWorkspace.name} as ${role}`);

    // Step 7: Prepare success response
    let successMessage = "Member added successfully";
    if (addedToDefault) {
      successMessage += ". User has been automatically added to The Burns Brothers workspace.";
    } else {
      successMessage += ". User was already a member of The Burns Brothers workspace.";
    }

    return successResponse(res, {
      member: newMember,
      addedToDefault,
      workspace: {
        id: targetWorkspace.id,
        name: targetWorkspace.name
      }
    }, successMessage);

  } catch (error) {
    console.error("💥 Error in addMember:", error);

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return errorResponse(res, 400, 
        "User is already a member of this workspace"
      );
    }

    if (error.code === 'P2025') {
      return errorResponse(res, 404, 
        "Related record not found. The user or workspace may have been deleted."
      );
    }

    return errorResponse(res, 500, 
      "Failed to add member to workspace", 
      error
    );
  }
};

// Remove member from workspace
export const removeMember = async (req, res) => {
  try {
    const { userId: currentUserId } = await req.auth();
    const { workspaceId, userId: targetUserId } = req.params;

    console.log(`🗑️ Remove member request:`, {
      currentUserId,
      workspaceId,
      targetUserId
    });

    // Validate input
    if (!workspaceId || !targetUserId) {
      return errorResponse(res, 400, 
        "Workspace ID and User ID are required"
      );
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
      return errorResponse(res, 404, "Workspace not found");
    }

    // Check if current user is admin or owner
    const currentUserMembership = workspace.members.find(m => m.userId === currentUserId);
    const isAdmin = currentUserMembership?.role === 'ADMIN';
    const isOwner = workspace.ownerId === currentUserId;

    if (!isAdmin && !isOwner) {
      return errorResponse(res, 403, 
        "Only workspace admins or owners can remove members"
      );
    }

    // Prevent removing workspace owner
    if (targetUserId === workspace.ownerId) {
      return errorResponse(res, 400, 
        "Cannot remove workspace owner"
      );
    }

    // Prevent removing yourself
    if (targetUserId === currentUserId) {
      return errorResponse(res, 400, 
        "Cannot remove yourself from workspace"
      );
    }

    // Find the member to remove
    const memberToRemove = workspace.members.find(m => m.userId === targetUserId);
    if (!memberToRemove) {
      return errorResponse(res, 404, 
        "User is not a member of this workspace"
      );
    }

    console.log(`🔍 Removing member: ${memberToRemove.user.name} from ${workspace.name}`);

    // Remove member from all projects in this workspace first
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: { members: true }
    });

    // Remove user from all project memberships in this workspace
    for (const project of projects) {
      const projectMembership = project.members.find(m => m.userId === targetUserId);
      if (projectMembership) {
        await prisma.projectMember.delete({
          where: { 
            userId_projectId: { 
              userId: targetUserId, 
              projectId: project.id 
            } 
          }
        });
        console.log(`➖ Removed from project: ${project.name}`);
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
      const taskAssignment = task.assignees.find(a => a.userId === targetUserId);
      if (taskAssignment) {
        await prisma.taskAssignee.delete({
          where: { 
            taskId_userId: { 
              taskId: task.id, 
              userId: targetUserId 
            } 
          }
        });
        console.log(`➖ Removed from task: ${task.title}`);
      }
    }

    // Finally, remove member from workspace
    await prisma.workspaceMember.delete({
      where: { 
        userId_workspaceId: { 
          userId: targetUserId, 
          workspaceId 
        } 
      }
    });

    console.log(`✅ Successfully removed member ${targetUserId} from workspace ${workspaceId}`);

    return successResponse(res, {
      removedMember: {
        id: memberToRemove.id,
        user: memberToRemove.user,
        role: memberToRemove.role
      }
    }, "Member removed successfully");

  } catch (error) {
    console.error("💥 Error removing workspace member:", error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2025') {
      return errorResponse(res, 404, 
        "Member not found in workspace"
      );
    }
    
    return errorResponse(res, 500, 
      "Failed to remove member from workspace", 
      error
    );
  }
};

// Update member role
export const updateMemberRole = async (req, res) => {
  try {
    const { userId: currentUserId } = await req.auth();
    const { workspaceId, userId: targetUserId } = req.params;
    const { role } = req.body;

    console.log(`🔄 Update role request:`, {
      currentUserId,
      workspaceId,
      targetUserId,
      newRole: role
    });

    if (!workspaceId || !targetUserId || !role) {
      return errorResponse(res, 400,
        "Workspace ID, User ID, and role are required"
      );
    }

    if (!["ADMIN", "MEMBER"].includes(role)) {
      return errorResponse(res, 400, "Invalid role. Must be ADMIN or MEMBER");
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true, owner: true },
    });

    if (!workspace) {
      return errorResponse(res, 404, "Workspace not found");
    }

    // Check if current user is owner (only owner can change roles)
    const isOwner = workspace.ownerId === currentUserId;
    if (!isOwner) {
      return errorResponse(res, 403,
        "Only workspace owner can change member roles"
      );
    }

    // Prevent changing owner's role
    if (targetUserId === workspace.ownerId) {
      return errorResponse(res, 400,
        "Cannot change workspace owner's role"
      );
    }

    const memberToUpdate = workspace.members.find((m) => m.userId === targetUserId);
    if (!memberToUpdate) {
      return errorResponse(res, 404,
        "User is not a member of this workspace"
      );
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
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

    console.log(`✅ Successfully updated ${updatedMember.user.name} role to ${role}`);

    return successResponse(res, {
      member: updatedMember
    }, "Member role updated successfully");

  } catch (error) {
    console.error("💥 Error updating member role:", error);
    return errorResponse(res, 500,
      "Failed to update member role",
      error
    );
  }
};

// Get workspace by ID
export const getWorkspaceById = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId } = req.params;

    console.log(`🔍 Fetching workspace: ${workspaceId} for user: ${userId}`);

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
      return errorResponse(res, 404, "Workspace not found");
    }

    // Check if user is a member of this workspace
    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      return errorResponse(res, 403,
        "You don't have access to this workspace"
      );
    }

    console.log(`✅ Successfully retrieved workspace: ${workspace.name}`);

    return successResponse(res, { workspace }, "Workspace retrieved successfully");

  } catch (error) {
    console.error("💥 Error fetching workspace:", error);
    return errorResponse(res, 500,
      "Failed to fetch workspace",
      error
    );
  }
};

// Update workspace
export const updateWorkspace = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId } = req.params;
    const { name, description, settings } = req.body;

    console.log(`✏️ Update workspace request:`, {
      userId,
      workspaceId,
      updates: { name, description }
    });

    if (!workspaceId) {
      return errorResponse(res, 400, "Workspace ID is required");
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) {
      return errorResponse(res, 404, "Workspace not found");
    }

    // Check permissions - only owner or admin can update
    const isOwner = workspace.ownerId === userId;
    const isAdmin = workspace.members.some(
      (m) => m.userId === userId && m.role === "ADMIN"
    );

    if (!isOwner && !isAdmin) {
      return errorResponse(res, 403,
        "You don't have permission to update this workspace"
      );
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

    console.log(`✅ Successfully updated workspace: ${updatedWorkspace.name}`);

    return successResponse(res, {
      workspace: updatedWorkspace
    }, "Workspace updated successfully");

  } catch (error) {
    console.error("💥 Error updating workspace:", error);
    return errorResponse(res, 500,
      "Failed to update workspace",
      error
    );
  }
};

// Delete a workspace (only owner or admin)
export const deleteWorkspace = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { workspaceId } = req.params;

    console.log(`🗑️ Delete workspace request:`, { userId, workspaceId });

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });
    
    if (!workspace) {
      return errorResponse(res, 404, "Workspace not found");
    }

    const isOwner = workspace.ownerId === userId;
    const isAdmin = workspace.members.some(
      (m) => m.userId === userId && m.role === "ADMIN"
    );
    
    if (!isOwner && !isAdmin) {
      return errorResponse(res, 403,
        "You don't have permission to delete this workspace"
      );
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
    
    console.log(`✅ Successfully deleted workspace: ${workspaceId}`);

    return successResponse(res, { 
      workspaceId 
    }, "Workspace deleted successfully");

  } catch (error) {
    console.error("💥 Error deleting workspace:", error);
    return errorResponse(res, 500,
      "Failed to delete workspace",
      error
    );
  }
};

// Utility function to get or create default workspace
const getOrCreateDefaultWorkspace = async () => {
  try {
    console.log(`🔍 Looking for default workspace...`);
    
    // First, try to find the default workspace
    let defaultWorkspace = await prisma.workspace.findFirst({
      where: { 
        OR: [
          { slug: DEFAULT_WORKSPACE_SLUG },
          { name: DEFAULT_WORKSPACE_NAME }
        ]
      },
    });

    if (!defaultWorkspace) {
      console.log(`⚠️ Default workspace not found, creating it...`);
      
      // Create a system user or use a fallback owner
      // For now, we'll create it with a placeholder owner
      // In a real system, you might want to handle this differently
      const systemUser = await prisma.user.findFirst({
        where: { email: { contains: 'admin' } }
      });

      if (!systemUser) {
        console.error(`❌ No system user found to own default workspace`);
        return null;
      }

      defaultWorkspace = await prisma.workspace.create({
        data: {
          id: `org_default_${Date.now()}`,
          name: DEFAULT_WORKSPACE_NAME,
          slug: DEFAULT_WORKSPACE_SLUG,
          ownerId: systemUser.id,
          description: "Default workspace for all users",
        },
      });
      
      console.log(`✅ Created default workspace: ${defaultWorkspace.name}`);
    } else {
      console.log(`✅ Found default workspace: ${defaultWorkspace.name}`);
    }

    return defaultWorkspace;
  } catch (error) {
    console.error("💥 Error in getOrCreateDefaultWorkspace:", error);
    return null;
  }
};

// Ensure default workspace for a user
export const ensureDefaultWorkspace = async (userId) => {
  try {
    console.log(`🔄 ensureDefaultWorkspace called for user: ${userId}`);
    
    // First, verify the user exists
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.warn(`⚠️ User ${userId} not found in database`);
      return null;
    }

    const defaultWorkspace = await getOrCreateDefaultWorkspace();
    
    if (!defaultWorkspace) {
      console.error(`❌ Default workspace not available`);
      return null;
    }

    console.log(`✅ Found default workspace: ${defaultWorkspace.name} (ID: ${defaultWorkspace.id})`);

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: defaultWorkspace.id },
      },
    });

    if (!existingMember) {
      console.log(`➕ Adding user ${userId} to default workspace as MEMBER`);
      await prisma.workspaceMember.create({
        data: {
          userId,
          workspaceId: defaultWorkspace.id,
          role: "MEMBER",
          message: "Auto-joined default workspace",
        },
      });
      console.log(`✅ User ${userId} joined The Burns Brothers`);
    } else {
      console.log(`ℹ️ User ${userId} already in default workspace as ${existingMember.role}`);
    }

    return defaultWorkspace;
  } catch (error) {
    console.error("💥 Error in ensureDefaultWorkspace:", error);
    
    if (error.code === 'P2002') {
      console.log('ℹ️ User already exists in workspace (unique constraint)');
      // Try to return the workspace anyway
      const workspace = await prisma.workspace.findFirst({
        where: { 
          OR: [
            { slug: DEFAULT_WORKSPACE_SLUG },
            { name: DEFAULT_WORKSPACE_NAME }
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
    console.error("💥 Error creating user with default workspace:", error);
    throw error;
  }
};