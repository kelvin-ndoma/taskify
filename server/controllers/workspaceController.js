// src/controllers/workspaceController.js
import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";
import { verifyToken } from "../utils/auth.js";

// Validation schemas
const workspaceSchema = {
  create: {
    name: { type: 'string', min: 1, max: 100, required: true },
    description: { type: 'string', max: 500, required: false }
  },
  update: {
    name: { type: 'string', min: 1, max: 100, required: false },
    description: { type: 'string', max: 500, required: false },
    settings: { type: 'object', required: false }
  },
  addMember: {
    email: { type: 'string', required: true },
    role: { type: 'string', enum: ['ADMIN', 'MEMBER'], required: true },
    workspaceId: { type: 'string', required: true },
    message: { type: 'string', max: 200, required: false }
  }
};

// Helper functions
const getUserIdFromToken = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }
    
    const decoded = verifyToken(token);
    return decoded.userId;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid token');
  }
};

// 🆕 NEW: Get user with role from token
const getUserFromToken = async (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }
    
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid token');
  }
};

// 🆕 NEW: Check if user can create workspace
const canCreateWorkspace = (user) => {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
};

// 🆕 NEW: Check workspace creation limits for regular members
const checkWorkspaceCreationLimit = async (userId) => {
  const userWorkspacesCount = await prisma.workspace.count({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId: userId } } }
      ]
    }
  });
  
  const MAX_WORKSPACES_FOR_MEMBERS = 3;
  return userWorkspacesCount < MAX_WORKSPACES_FOR_MEMBERS;
};

const validateInput = (data, schema) => {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
      }
      
      if (rules.min && typeof value === 'string' && value.length < rules.min) {
        errors.push(`${field} must be at least ${rules.min} characters`);
      }
      
      if (rules.max && typeof value === 'string' && value.length > rules.max) {
        errors.push(`${field} must be less than ${rules.max} characters`);
      }
      
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }
  }
  
  return errors;
};

const basicUserFields = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true
};

const generateUniqueSlug = async (name) => {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  let slug = baseSlug;
  let counter = 1;
  
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

const auditLog = async (action, userId, resourceType, resourceId, details = {}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        resourceType,
        resourceId,
        details,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.warn('Failed to create audit log:', error);
  }
};

// 🆕 UPDATED CREATE WORKSPACE - Now with admin support
export const createWorkspace = async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    const { name, description } = req.body;

    console.log('🔄 Create workspace request:', { 
      name, 
      description, 
      userId: user.id,
      userRole: user.role 
    });

    // Validate input
    const validationErrors = validateInput(req.body, workspaceSchema.create);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // 🆕 CHECK PERMISSIONS: Admins can create unlimited, members have limits
    if (!canCreateWorkspace(user)) {
      const canCreate = await checkWorkspaceCreationLimit(user.id);
      if (!canCreate) {
        return res.status(403).json({
          message: 'You have reached the maximum number of workspaces (3). Please upgrade or contact an administrator.'
        });
      }
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(name);

    console.log('✅ Creating workspace with data:', {
      name: name.trim(),
      slug,
      description: description?.trim() || '',
      ownerId: user.id,
      createdByRole: user.role
    });

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        slug,
        image_url: '',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN'
          }
        }
      },
      include: {
        members: {
          include: {
            user: { select: basicUserFields }
          }
        },
        projects: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        owner: { select: basicUserFields }
      }
    });

    console.log(`✅ Workspace created successfully: ${workspace.name} by user ${user.id} (${user.role})`);

    // Audit log
    await auditLog('WORKSPACE_CREATED', user.id, 'WORKSPACE', workspace.id, {
      workspaceName: workspace.name,
      slug: workspace.slug,
      createdByRole: user.role
    });

    // Trigger Inngest event for workspace setup
    try {
      await inngest.send({
        name: 'app/workspace.created',
        data: {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          ownerId: user.id,
          createdByRole: user.role,
        },
      });
    } catch (inngestError) {
      console.warn('⚠️ Inngest event failed, but workspace was created:', inngestError);
    }

    res.status(201).json({
      workspace,
      message: 'Workspace created successfully',
      userRole: user.role
    });

  } catch (error) {
    console.error('❌ Create workspace error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'A workspace with this name already exists. Please choose a different name.' 
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Failed to create workspace' 
    });
  }
};

// 🆕 NEW: Get user's workspace creation limits
export const getWorkspaceLimits = async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    
    const userWorkspacesCount = await prisma.workspace.count({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } }
        ]
      }
    });

    const canCreateUnlimited = canCreateWorkspace(user);
    const maxWorkspaces = canCreateUnlimited ? null : 3;
    const canCreateMore = canCreateUnlimited ? true : userWorkspacesCount < 3;

    res.json({
      userRole: user.role,
      currentWorkspaces: userWorkspacesCount,
      maxWorkspaces: maxWorkspaces,
      canCreateMore: canCreateMore,
      canCreateUnlimited: canCreateUnlimited
    });

  } catch (error) {
    console.error('Error getting workspace limits:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to get workspace limits' 
    });
  }
};

// Add this function to workspaceController.js
export const processPendingInvitations = async (userId, email) => {
  try {
    console.log('🔍 Processing pending invitations for:', { userId, email });
    
    // Find all pending invitations for this email
    const pendingInvitations = await prisma.invitation.findMany({
      where: {
        email: email.toLowerCase().trim(),
        status: 'PENDING'
      },
      include: {
        workspace: true,
        invitedBy: {
          select: basicUserFields
        }
      }
    });

    console.log(`📨 Found ${pendingInvitations.length} pending invitations`);

    for (const invitation of pendingInvitations) {
      try {
        // Check if user is already a member (in case of duplicate processing)
        const existingMember = await prisma.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: userId,
              workspaceId: invitation.workspaceId
            }
          }
        });

        if (existingMember) {
          console.log('ℹ️ User already member of workspace, skipping:', invitation.workspace.name);
          continue;
        }

        // Add user to workspace
        await prisma.workspaceMember.create({
          data: {
            userId: userId,
            workspaceId: invitation.workspaceId,
            role: invitation.role,
            message: invitation.message || `Joined via invitation from ${invitation.invitedBy?.name || 'team member'}`
          }
        });

        // Update invitation status
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' }
        });

        console.log('✅ Added user to workspace via invitation:', {
          workspace: invitation.workspace.name,
          userId: userId,
          role: invitation.role
        });

        // Send welcome email for this workspace
        await inngest.send({
          name: "app/workspace.welcome",
          data: {
            workspaceId: invitation.workspaceId,
            userId: userId,
            workspaceName: invitation.workspace.name,
            inviterName: invitation.invitedBy?.name || "Team Member"
          },
        });

      } catch (error) {
        console.error('❌ Failed to process invitation:', invitation.id, error);
        // Continue with other invitations even if one fails
      }
    }

    console.log('🎯 Finished processing pending invitations');
    
  } catch (error) {
    console.error('❌ Error processing pending invitations:', error);
  }
};

// 🆕 NEW: Admin endpoint to create workspace for other users
export const createWorkspaceForUser = async (req, res) => {
  try {
    const adminUser = await getUserFromToken(req);
    const { name, description, userId } = req.body;

    // Only SUPER_ADMIN can create workspaces for other users
    if (adminUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        message: 'Only super admins can create workspaces for other users'
      });
    }

    // Validate input
    const validationErrors = validateInput(req.body, workspaceSchema.create);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: basicUserFields
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(name);

    console.log('✅ Admin creating workspace for user:', {
      workspaceName: name,
      targetUserId: userId,
      adminId: adminUser.id
    });

    // Create workspace with target user as owner
    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        slug,
        image_url: '',
        ownerId: userId,
        members: {
          create: [
            {
              userId: userId,
              role: 'ADMIN'
            },
            {
              userId: adminUser.id,
              role: 'ADMIN'
            }
          ]
        }
      },
      include: {
        members: {
          include: {
            user: { select: basicUserFields }
          }
        },
        owner: { select: basicUserFields }
      }
    });

    // Audit log
    await auditLog('WORKSPACE_CREATED_FOR_USER', adminUser.id, 'WORKSPACE', workspace.id, {
      workspaceName: workspace.name,
      targetUserId: userId,
      targetUserEmail: targetUser.email,
      adminRole: adminUser.role
    });

    res.status(201).json({
      workspace,
      message: `Workspace created successfully for user ${targetUser.email}`
    });

  } catch (error) {
    console.error('❌ Admin create workspace error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'A workspace with this name already exists' 
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Failed to create workspace for user' 
    });
  }
};

// Get all workspaces for User
export const getUserWorkspaces = async (req, res) => {
  try {
    const user = await getUserFromToken(req);

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
      include: {
        members: {
          include: {
            user: { select: basicUserFields },
          },
        },
        projects: {
          take: 10,
          include: {
            folders: {
              take: 5,
              include: {
                tasks: {
                  take: 10,
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    due_date: true,
                    _count: {
                      select: {
                        assignees: true,
                        comments: true
                      }
                    }
                  }
                },
              },
              orderBy: { position: 'asc' }
            },
            tasks: {
              where: { folderId: null },
              take: 10,
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                due_date: true,
                _count: {
                  select: {
                    assignees: true,
                    comments: true
                  }
                }
              }
            },
            members: {
              include: {
                user: { select: basicUserFields },
              },
            },
          },
        },
        owner: { select: basicUserFields },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ 
      workspaces,
      currentUserRole: user.role
    });
  } catch (error) {
    console.log('Error fetching workspaces:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch workspaces' });
  }
};

// In workspaceController.js - REPLACE the addMember function with this:

export const addMember = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { email, role, workspaceId, message } = req.body;

    console.log('🟢 ADD_MEMBER - Starting invitation for:', { email, workspaceId });

    // Validate input
    const validationErrors = validateInput(req.body, workspaceSchema.addMember);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check if workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { 
        members: {
          include: {
            user: { select: basicUserFields }
          }
        }, 
        owner: true 
      },
    });
    
    if (!workspace) {
      console.log('❌ Workspace not found:', workspaceId);
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if current user is a member of this workspace
    const currentUserMembership = workspace.members.find(m => m.userId === userId);
    if (!currentUserMembership) {
      return res.status(403).json({ 
        message: "You don't have access to this workspace" 
      });
    }

    // Check permissions
    const isAdmin = currentUserMembership.role === "ADMIN";
    const isOwner = workspace.ownerId === userId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        message: "You don't have permission to add members" 
      });
    }

    console.log('✅ Workspace found:', workspace.name);

    // Check if user exists
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() } 
    });

    // If user doesn't exist, create invitation record and send email
    if (!user) {
      console.log('📧 User does not exist, sending invitation email to:', email);
      
      const inviter = await prisma.user.findUnique({ 
        where: { id: userId },
        select: basicUserFields
      });

      // 🆕 CRITICAL FIX: Create pending invitation record
      await prisma.invitation.create({
        data: {
          email: email.toLowerCase().trim(),
          workspaceId: workspaceId,
          role: role,
          invitedById: userId,
          status: 'PENDING',
          message: message || `You've been invited to join ${workspace.name}`
        }
      });

      console.log('✅ Created pending invitation record for:', email);
      
      // Send invitation email via Inngest
      await inngest.send({
        name: "app/workspace.invitation",
        data: {
          workspaceId,
          inviteeEmail: email,
          inviterName: inviter?.name || "Team Member",
          origin: req.headers.origin || process.env.APP_URL || "",
          role,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Invitation sent successfully! The user will receive an email to join the workspace.",
        requiresSignup: true,
        email: email.trim()
      });
    }

    console.log('✅ User exists:', user.name, user.id);

    // Check if user is already a member of this workspace
    const existingMember = workspace.members.find((m) => m.userId === user.id);
    if (existingMember) {
      console.log('❌ User already member of this workspace:', {
        userId: user.id,
        workspaceId: workspaceId,
        existingRole: existingMember.role
      });
      return res.status(400).json({ 
        message: "User is already a member of this workspace",
        existingRole: existingMember.role
      });
    }

    console.log('✅ User not in this workspace, adding them...');

    // Add existing user to workspace using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Ensure user has default workspace
      await ensureDefaultWorkspace(user.id, tx);

      // Add to workspace
      const member = await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId,
          role,
          message: message || `Invited to ${workspace.name}`,
        },
        include: {
          user: { select: basicUserFields },
        },
      });

      return member;
    });

    console.log('✅ Successfully added user to workspace:', {
      userName: user.name,
      workspaceName: workspace.name,
      role: role
    });

    res.json({
      member: result,
      message: `Member added successfully to ${workspace.name}`,
    });

  } catch (error) {
    console.error("❌ Error adding member:", error);
    console.error("❌ Error details:", {
      code: error.code,
      message: error.message,
      meta: error.meta
    });
    
    if (error.code === "P2002") {
      return res.status(400).json({
        message: "User is already a member of this workspace",
      });
    }
    res.status(500).json({
      message: error.message || "Failed to add member to workspace",
    });
  }
};

// Remove member from workspace
export const removeMember = async (req, res) => {
  try {
    const currentUserId = getUserIdFromToken(req);
    const { workspaceId, userId } = req.params;

    if (!workspaceId || !userId) {
      return res.status(400).json({ 
        message: "Workspace ID and User ID are required" 
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get workspace with members
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          members: {
            include: {
              user: { select: basicUserFields },
            },
          },
          owner: { select: basicUserFields },
        },
      });

      if (!workspace) {
        throw new Error("Workspace not found");
      }

      const currentUserMembership = workspace.members.find(
        (m) => m.userId === currentUserId
      );
      const isAdmin = currentUserMembership?.role === "ADMIN";
      const isOwner = workspace.ownerId === currentUserId;

      if (!isAdmin && !isOwner) {
        throw new Error("Only workspace admins or owners can remove members");
      }

      if (userId === workspace.ownerId) {
        throw new Error("Cannot remove workspace owner");
      }

      if (userId === currentUserId) {
        throw new Error("Cannot remove yourself from workspace");
      }

      const memberToRemove = workspace.members.find((m) => m.userId === userId);
      if (!memberToRemove) {
        throw new Error("User is not a member of this workspace");
      }

      // Remove member from all projects in workspace
      await tx.projectMember.deleteMany({
        where: { 
          userId,
          project: { workspaceId } 
        },
      });

      // Remove user from task assignments in workspace
      await tx.taskAssignee.deleteMany({
        where: { 
          userId,
          task: { project: { workspaceId } }
        },
      });

      // Remove workspace membership
      await tx.workspaceMember.delete({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
      });

      return { workspace, memberToRemove };
    });

    // Audit log
    await auditLog('MEMBER_REMOVED', currentUserId, 'WORKSPACE', workspaceId, {
      removedMemberId: userId,
      removedMemberEmail: result.memberToRemove.user.email
    });

    res.json({
      message: "Member removed successfully",
      removedMember: {
        id: result.memberToRemove.id,
        user: result.memberToRemove.user,
        role: result.memberToRemove.role,
      },
    });

  } catch (error) {
    console.error("Error removing workspace member:", error);
    
    if (error.message === "Workspace not found") {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message.includes("permission") || 
        error.message.includes("Cannot remove")) {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Member not found in workspace",
      });
    }
    
    res.status(500).json({
      message: error.message || "Failed to remove member from workspace",
    });
  }
};

// Delete workspace (only owner or admin)
export const deleteWorkspace = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { workspaceId } = req.params;
    
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });
    
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isOwner = workspace.ownerId === userId;
    const isAdmin = workspace.members.some(
      (m) => m.userId === userId && m.role === "ADMIN"
    );
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        message: "You don't have permission to delete this workspace" 
      });
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
    
    // Audit log
    await auditLog('WORKSPACE_DELETED', userId, 'WORKSPACE', workspaceId, {
      workspaceName: workspace.name
    });

    res.json({ 
      message: "Workspace deleted successfully", 
      workspaceId 
    });
    
  } catch (error) {
    console.error("Error deleting workspace:", error);
    res.status(500).json({ 
      message: error.message || "Failed to delete workspace" 
    });
  }
};

// Update workspace
export const updateWorkspace = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { workspaceId } = req.params;
    const { name, description, settings } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required" });
    }

    // Validate input
    const validationErrors = validateInput(req.body, workspaceSchema.update);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });
    
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    
    const isOwner = workspace.ownerId === userId;
    const isAdmin = workspace.members.some(
      (m) => m.userId === userId && m.role === "ADMIN"
    );
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "You don't have permission to update this workspace",
      });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (settings) updateData.settings = settings;

    // If name changed, generate new slug
    if (name && name !== workspace.name) {
      updateData.slug = await generateUniqueSlug(name);
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
      include: {
        members: {
          include: {
            user: { select: basicUserFields },
          },
        },
        owner: { select: basicUserFields },
      },
    });

    // Audit log
    await auditLog('WORKSPACE_UPDATED', userId, 'WORKSPACE', workspaceId, {
      updatedFields: Object.keys(updateData)
    });

    res.json({
      workspace: updatedWorkspace,
      message: "Workspace updated successfully",
    });
    
  } catch (error) {
    console.error("Error updating workspace:", error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'A workspace with this name already exists' 
      });
    }
    
    res.status(500).json({ 
      message: error.message || "Failed to update workspace" 
    });
  }
};

// Get workspace by ID
export const getWorkspaceById = async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    const { workspaceId } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: { select: basicUserFields },
          },
        },
        projects: {
          take: 10,
          include: {
            folders: {
              take: 5,
              select: {
                id: true,
                name: true,
                description: true,
                position: true,
                _count: { select: { tasks: true } }
              },
              orderBy: { position: 'asc' }
            },
            tasks: {
              where: { folderId: null },
              take: 10,
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                due_date: true,
                _count: {
                  select: {
                    assignees: true,
                    comments: true
                  }
                }
              }
            },
            members: {
              include: {
                user: { select: basicUserFields },
              },
            },
          },
        },
        owner: { select: basicUserFields },
      },
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isMember = workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return res.status(403).json({
        message: "You don't have access to this workspace",
      });
    }

    res.json({ 
      workspace,
      currentUserRole: user.role
    });
  } catch (error) {
    console.error("Error fetching workspace:", error);
    res.status(500).json({ 
      message: error.message || "Failed to fetch workspace" 
    });
  }
};

// Update member role
export const updateMemberRole = async (req, res) => {
  try {
    const currentUserId = getUserIdFromToken(req);
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

    const isOwner = workspace.ownerId === currentUserId;
    if (!isOwner) {
      return res.status(403).json({
        message: "Only workspace owner can change member roles",
      });
    }

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
        userId_workspaceId: { userId, workspaceId },
      },
      data: { role },
      include: {
        user: { select: basicUserFields },
      },
    });

    // Audit log
    await auditLog('MEMBER_ROLE_UPDATED', currentUserId, 'WORKSPACE', workspaceId, {
      memberId: userId,
      previousRole: memberToUpdate.role,
      newRole: role
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

// Ensure user's membership in default workspace (with transaction support)
export const ensureDefaultWorkspace = async (userId, transaction = prisma) => {
  try {
    console.log('🔍 ensureDefaultWorkspace - Starting for user:', userId);
    
    const user = await transaction.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log('❌ ensureDefaultWorkspace - User not found:', userId);
      return null;
    }

    console.log('✅ ensureDefaultWorkspace - User found:', user.email);

    // Look for default workspace by slug or name
    let workspace = await transaction.workspace.findFirst({
      where: {
        OR: [
          { slug: "the-burns-brothers" },
          { name: "The Burns Brothers" },
        ],
      },
    });

    console.log('🔍 ensureDefaultWorkspace - Workspace lookup result:', {
      found: !!workspace,
      workspaceId: workspace?.id,
      workspaceName: workspace?.name
    });

    // If default workspace doesn't exist, create it
    if (!workspace) {
      console.log('🏢 ensureDefaultWorkspace - Creating default workspace...');
      
      workspace = await transaction.workspace.create({
        data: {
          id: `org_${Math.random().toString(36).substr(2, 9)}`,
          name: "The Burns Brothers",
          slug: "the-burns-brothers",
          ownerId: userId,
          description: "Default workspace for all users",
        },
      });
      
      console.log('✅ ensureDefaultWorkspace - Created default workspace:', workspace.id);
    }

    // Check if user is already a member
    const existingMember = await transaction.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: workspace.id },
      },
    });

    if (!existingMember) {
      console.log('👥 ensureDefaultWorkspace - Adding user to default workspace...');
      
      await transaction.workspaceMember.create({
        data: {
          userId,
          workspaceId: workspace.id,
          role: "MEMBER",
          message: "Auto-joined default workspace",
        },
      });
      
      console.log('✅ ensureDefaultWorkspace - User added to default workspace');
    } else {
      console.log('ℹ️ ensureDefaultWorkspace - User already in default workspace as:', existingMember.role);
    }

    console.log('🎯 ensureDefaultWorkspace - Successfully ensured default workspace:', {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      userId: userId
    });

    return workspace;

  } catch (error) {
    console.error('❌ ensureDefaultWorkspace - Error:', error);
    return null;
  }
};