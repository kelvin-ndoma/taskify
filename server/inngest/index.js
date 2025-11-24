import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/resend.js";

export const inngest = new Inngest({ id: "project-management" });

const DEFAULT_WORKSPACE_NAME = "The Burns Brothers";
const DEFAULT_WORKSPACE_SLUG = "the-burns-brothers";

/* =========================================================
   🔹 CLERK USER SYNC FUNCTIONS
========================================================= */

const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    try {
      console.log(`👤 Creating user: ${data.id}`);

      const firstName = data.first_name || "";
      const lastName = data.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      
      const email = data.email_addresses?.[0]?.email_address || "";
      
      let finalName = fullName;
      if (!finalName) {
        const emailUsername = email.split('@')[0] || "user";
        finalName = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
      }

      if (!finalName || finalName === 'User') {
        finalName = `User ${data.id.slice(-4)}`;
      }

      console.log(`📝 Setting user name to: "${finalName}"`);
      console.log(`📧 User email: ${email}`);

      // Create or update the user with proper names
      const user = await prisma.user.upsert({
        where: { id: data.id },
        update: {
          email: email,
          name: finalName,
          image: data.image_url || "",
        },
        create: {
          id: data.id,
          email: email,
          name: finalName,
          image: data.image_url || "",
        },
      });

      console.log(`✅ User created: ${user.name} (${user.email})`);

      // Find the default workspace by SLUG or NAME
      const defaultWorkspace = await prisma.workspace.findFirst({
        where: { 
          OR: [
            { slug: DEFAULT_WORKSPACE_SLUG },
            { name: DEFAULT_WORKSPACE_NAME }
          ]
        },
      });

      if (!defaultWorkspace) {
        console.log(`⚠️ Default workspace "${DEFAULT_WORKSPACE_NAME}" not found. Creating it...`);
        
        // Create the default workspace if it doesn't exist
        const newWorkspace = await prisma.workspace.create({
          data: {
            id: `org_${Math.random().toString(36).substr(2, 9)}`,
            name: DEFAULT_WORKSPACE_NAME,
            slug: DEFAULT_WORKSPACE_SLUG,
            ownerId: user.id,
            description: "Default workspace for all users",
          },
        });
        
        console.log(`✅ Created default workspace: ${newWorkspace.id}`);
        
        // Add user to the newly created workspace as ADMIN
        await prisma.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: newWorkspace.id,
            role: "ADMIN",
          },
        });
        console.log(`✅ Added ${user.name} as ADMIN to newly created default workspace`);
        
      } else {
        console.log(`✅ Found existing default workspace: ${defaultWorkspace.name} (ID: ${defaultWorkspace.id})`);
        
        // Check if user already in the default workspace
        const existingMembership = await prisma.workspaceMember.findFirst({
          where: {
            userId: user.id,
            workspaceId: defaultWorkspace.id,
          },
        });

        if (!existingMembership) {
          await prisma.workspaceMember.create({
            data: {
              userId: user.id,
              workspaceId: defaultWorkspace.id,
              role: "MEMBER",
            },
          });
          console.log(`✅ Added ${user.name} to existing default workspace "${defaultWorkspace.name}"`);
        } else {
          console.log(`ℹ️ User already in default workspace as ${existingMembership.role}`);
        }
      }
    } catch (error) {
      console.error("❌ Error creating user:", error);
      
      // Log specific Prisma errors for better debugging
      if (error.code === 'P2002') {
        console.error('🔑 Unique constraint violation - user might already exist');
      } else if (error.code === 'P2025') {
        console.error('❌ Record not found');
      }
    }
  }
);

// User deletion
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;

    try {
      await prisma.user.delete({
        where: { id: data.id },
      });
      console.log(`✅ User deleted: ${data.id}`);
    } catch (error) {
      console.error("❌ Error deleting user:", error);
    }
  }
);

// User update
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;

    try {
      await prisma.user.update({
        where: { id: data.id },
        data: {
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
          image: data.image_url || "",
        },
      });
      console.log(`✅ User updated: ${data.id}`);
    } catch (error) {
      console.error("❌ Error updating user:", error);
    }
  }
);

/* =========================================================
   🔹 CLERK ORGANIZATION (WORKSPACE) SYNC FUNCTIONS
========================================================= */

const syncWorkspaceCreation = inngest.createFunction(
  { id: "sync-workspace-from-clerk" },
  { event: "clerk/organization.created" },
  async ({ event }) => {
    const { data } = event;

    try {
      console.log(`🏢 Creating workspace: ${data.name}`);

      const existingWorkspace = await prisma.workspace.findUnique({
        where: { id: data.id },
      });

      if (existingWorkspace) {
        console.log(`ℹ️ Workspace ${data.id} already exists`);
        return;
      }

      // 🚫 REMOVED: Fake user creation - only proceed if owner exists
      const ownerUser = await prisma.user.findUnique({
        where: { id: data.created_by },
      });

      if (!ownerUser) {
        console.log(`❌ Owner user ${data.created_by} not found. Cannot create workspace.`);
        return;
      }

      // Create workspace
      const workspace = await prisma.workspace.create({
        data: {
          id: data.id,
          name: data.name,
          slug: data.slug,
          ownerId: data.created_by,
          image_url: data.image_url || "",
        },
      });

      // Add creator as admin
      await prisma.workspaceMember.create({
        data: {
          userId: data.created_by,
          workspaceId: data.id,
          role: "ADMIN",
        },
      });

      console.log(`✅ Created workspace: ${workspace.name}`);
    } catch (error) {
      console.error("❌ Error creating workspace:", error);
    }
  }
);

// Workspace update
const syncWorkspaceUpdation = inngest.createFunction(
  { id: "update-workspace-from-clerk" },
  { event: "clerk/organization.updated" },
  async ({ event }) => {
    const { data } = event;

    try {
      const existingWorkspace = await prisma.workspace.findUnique({
        where: { id: data.id },
      });

      if (!existingWorkspace) {
        console.log(`⚠️ Workspace not found, checking if owner exists`);
        
        // 🚫 REMOVED: Auto-creation without owner check
        const ownerUser = await prisma.user.findUnique({
          where: { id: data.created_by },
        });

        if (!ownerUser) {
          console.log(`❌ Owner user ${data.created_by} not found. Cannot create workspace.`);
          return;
        }

        await prisma.workspace.create({
          data: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            ownerId: data.created_by,
          },
        });
        console.log(`✅ Created missing workspace: ${data.name}`);
      } else {
        await prisma.workspace.update({
          where: { id: data.id },
          data: {
            name: data.name,
            slug: data.slug,
            image_url: data.image_url || "",
          },
        });
        console.log(`✅ Workspace updated: ${data.name}`);
      }
    } catch (error) {
      console.error("❌ Error updating workspace:", error);
    }
  }
);

// Workspace deletion
const syncWorkspaceDeletion = inngest.createFunction(
  { id: "delete-workspace-with-clerk" },
  { event: "clerk/organization.deleted" },
  async ({ event }) => {
    const { data } = event;
    try {
      await prisma.workspace.delete({ where: { id: data.id } });
      console.log(`✅ Deleted workspace: ${data.id}`);
    } catch (error) {
      console.error("❌ Error deleting workspace:", error);
    }
  }
);

// Add member to workspace after invitation accepted
const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;

    try {
      console.log(`👥 Adding user to workspace: ${data.user_id} to ${data.organization_id}`);

      // 🚫 REMOVED: Fake user creation - only proceed if user exists
      const user = await prisma.user.findUnique({ 
        where: { id: data.user_id } 
      });

      if (!user) {
        console.log(`❌ User ${data.user_id} not found in database. Cannot add to workspace.`);
        return;
      }

      console.log(`✅ Found existing user: ${user.name} (${user.email})`);

      // Add user to workspace
      await prisma.workspaceMember.create({
        data: {
          userId: data.user_id,
          workspaceId: data.organization_id,
          role: String(data.role).toUpperCase() || "MEMBER",
        },
      });

      console.log(`✅ Added ${user.name} to workspace ${data.organization_id} as ${data.role}`);

    } catch (error) {
      console.error("❌ Error adding workspace member:", error);
    }
  }
);

/* =========================================================
   🔹 INNGEST FUNCTION TO SEND EMAIL ON TASK CREATION
========================================================= */

const sendTaskAssignmentEmail = inngest.createFunction(
  { id: "send-task-assignment-mail" },
  { event: "app/task.assigned" },
  async ({ event, step }) => {
    const { taskId, assigneeId, origin } = event.data;
    
    // Fetch task with specific assignee - UPDATED: Include folder info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        assignees: {
          where: { userId: assigneeId },
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
        project: {
          include: {
            workspace: {
              select: {
                name: true
              }
            }
          }
        },
        folder: { // NEW: Include folder info
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!task) {
      console.error(`Task ${taskId} not found`);
      return;
    }

    if (task.assignees.length === 0) {
      console.error(`Assignee ${assigneeId} not found for task ${taskId}`);
      return;
    }

    const assignment = task.assignees[0];
    
    // NEW: Build folder context for email
    const folderContext = task.folder ? ` in folder "${task.folder.name}"` : '';
    
    // Send assignment email - UPDATED: Include folder info
    await step.run('send-assignment-email', async () => {
      await sendEmail({
        to: assignment.user.email,
        subject: `New Task Assignment in ${task.project.name}`,
        body: `<div style="max-width: 600px;">
          <h2>Hi ${assignment.user.name},</h2>
          <p style="font-size: 16px;">You've been assigned a new task in <strong>${task.project.workspace.name}</strong> → <strong>${task.project.name}</strong>${folderContext}:</p>
          <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>
          <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
            <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description || 'No description provided'}</p>
            ${task.folder ? `<p style="margin: 6px 0;"><strong>Folder:</strong> ${task.folder.name}</p>` : ''}
            <p style="margin: 6px 0;"><strong>Due Date:</strong> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</p>
            <p style="margin: 6px 0;"><strong>Priority:</strong> ${task.priority}</p>
            <p style="margin: 6px 0;"><strong>Status:</strong> ${task.status}</p>
            <p style="margin: 6px 0;"><strong>Type:</strong> ${task.type}</p>
          </div>
          <a href="${origin}/taskDetails?projectId=${task.projectId}&taskId=${taskId}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
            View Task
          </a>
          <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
            Please make sure to review and complete it before the due date.
          </p>
        </div>`
      });
      console.log(`✅ Assignment email sent to ${assignment.user.email} for task ${taskId}${folderContext}`);
    });

    // Schedule reminder if due date is in the future
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const today = new Date();
    
    if (dueDate && dueDate > today) {
      // Sleep until due date
      await step.sleepUntil('wait-for-due-date', dueDate);

      await step.run('check-if-task-is-completed', async () => {
        const updatedTask = await prisma.task.findUnique({
          where: { id: taskId },
          select: {
            status: true,
            title: true,
            due_date: true,
            description: true,
            type: true,
            folder: { // NEW: Include folder for reminder
              select: {
                name: true
              }
            },
            project: {
              include: {
                workspace: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });

        if (!updatedTask || updatedTask.status === "DONE" || updatedTask.status === "CANCELLED") {
          console.log(`Task ${taskId} is completed or cancelled, skipping reminder`);
          return;
        }

        // NEW: Build folder context for reminder
        const reminderFolderContext = updatedTask.folder ? ` in folder "${updatedTask.folder.name}"` : '';

        // Send reminder email - UPDATED: Include folder info
        await step.run('send-reminder-email', async () => {
          await sendEmail({
            to: assignment.user.email,
            subject: `Reminder: Task Due Today - ${updatedTask.project.name}`,
            body: `<div style="max-width: 600px;">
              <h2>Hi ${assignment.user.name},</h2>
              <p style="font-size: 16px;">You have a task due today in <strong>${updatedTask.project.workspace.name}</strong> → <strong>${updatedTask.project.name}</strong>${reminderFolderContext}:</p>
              <p style="font-size: 18px; font-weight: bold; color: #dc3545; margin: 8px 0;">${updatedTask.title}</p>
              <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                <p style="margin: 6px 0;"><strong>Description:</strong> ${updatedTask.description || 'No description provided'}</p>
                ${updatedTask.folder ? `<p style="margin: 6px 0;"><strong>Folder:</strong> ${updatedTask.folder.name}</p>` : ''}
                <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(updatedTask.due_date).toLocaleDateString()} <strong>(TODAY)</strong></p>
                <p style="margin: 6px 0;"><strong>Status:</strong> ${updatedTask.status}</p>
                <p style="margin: 6px 0;"><strong>Type:</strong> ${updatedTask.type}</p>
              </div>
              <a href="${origin}/taskDetails?projectId=${updatedTask.project.id}&taskId=${taskId}" style="background-color: #dc3545; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                View Task
              </a>
              <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                This task is due today. Please complete it as soon as possible.
              </p>
            </div>`
          });
          console.log(`✅ Reminder email sent to ${assignment.user.email} for task ${taskId}${reminderFolderContext}`);
        });
      });
    }
  }
);

/* =========================================================
   🔹 INNGEST FUNCTION TO SEND WORKSPACE INVITATION EMAIL
========================================================= */

const sendWorkspaceInvitationEmail = inngest.createFunction(
  { id: "send-workspace-invitation-mail" },
  { event: "app/workspace.invitation" },
  async ({ event, step }) => {
    const { workspaceId, inviteeEmail, inviterName, origin, role } = event.data;

    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { 
          owner: true,
          projects: { // NEW: Include projects for context
            include: {
              folders: { // NEW: Include folders for context
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
      });

      if (!workspace) {
        console.error(`❌ Workspace not found: ${workspaceId}`);
        return;
      }

      console.log(`📧 Sending workspace invitation to: ${inviteeEmail}`);

      // Use Clerk's sign-up URL with redirect to your app
      const clerkSignUpUrl = `https://accounts.tbbasco.com/sign-up?redirect_url=${encodeURIComponent(origin)}`;

      await sendEmail({
        to: inviteeEmail,
        subject: `You've been invited to join ${workspace.name}`,
        body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">🏢 Workspace Invitation</h1>
            <p style="color: #666; font-size: 16px;">You've been invited to join ${workspace.name}</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <h2 style="color: #007bff; margin: 0 0 15px 0;">${workspace.name}</h2>
            
            <div style="margin: 15px 0;">
              <p style="color: #555; margin: 0; line-height: 1.5;">
                <strong>${inviterName}</strong> has invited you to join as a <strong>${role}</strong>.
              </p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div>
                <strong style="color: #333; display: block;">Invited By</strong>
                <span style="color: #666;">${inviterName}</span>
              </div>
              <div>
                <strong style="color: #333; display: block;">Your Role</strong>
                <span style="color: #666; text-transform: capitalize;">${role.toLowerCase()}</span>
              </div>
            </div>
            
            <!-- NEW: Workspace stats -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
              <div>
                <strong style="color: #333; display: block;">Projects</strong>
                <span style="color: #666;">${workspace.projects.length}</span>
              </div>
              <div>
                <strong style="color: #333; display: block;">Active Tasks</strong>
                <span style="color: #666;">${workspace.projects.reduce((acc, project) => acc + (project.folders?.length || 0), 0)} folders</span>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; margin-bottom: 15px;">
              Click the button below to create your account and join the workspace:
            </p>
            <a href="${clerkSignUpUrl}" 
              style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Create Account & Join
            </a>
          </div>

          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This invitation will expire in 7 days. If you received this by mistake, please ignore this email.
            </p>
          </div>
        </div>`, 
      });

      console.log(`✅ Workspace invitation email sent to: ${inviteeEmail}`);
    } catch (error) {
      console.error("❌ Error sending workspace invitation email:", error);
    }
  }
);

/* =========================================================
   🔹 TASK UPDATES AND COMMENTS EMAIL FUNCTIONS
========================================================= */

const sendTaskStatusUpdateEmail = inngest.createFunction(
  { id: "send-task-status-update-mail" },
  { event: "app/task.status.updated" },
  async ({ event, step }) => {
    const { taskId, oldStatus, newStatus, updaterId, origin } = event.data;
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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
        project: {
          include: {
            workspace: {
              select: {
                name: true
              }
            }
          }
        },
        folder: { // NEW: Include folder info
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!task || task.assignees.length === 0) return;

    const updater = await prisma.user.findUnique({
      where: { id: updaterId },
      select: { name: true }
    });

    // NEW: Build folder context
    const folderContext = task.folder ? ` in folder "${task.folder.name}"` : '';

    for (const assignee of task.assignees) {
      await step.run(`send-status-update-email-${assignee.user.id}`, async () => {
        await sendEmail({
          to: assignee.user.email,
          subject: `Task Status Updated: ${task.title}`,
          body: `<div style="max-width: 600px;">
            <h2>Hi ${assignee.user.name},</h2>
            <p style="font-size: 16px;">The status of your task in <strong>${task.project.workspace.name}</strong> → <strong>${task.project.name}</strong>${folderContext} has been updated:</p>
            <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>
            <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
              <p style="margin: 6px 0;"><strong>Status Changed:</strong> ${oldStatus} → <strong>${newStatus}</strong></p>
              <p style="margin: 6px 0;"><strong>Updated By:</strong> ${updater?.name || "Team Member"}</p>
              ${task.folder ? `<p style="margin: 6px 0;"><strong>Folder:</strong> ${task.folder.name}</p>` : ''}
              <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description || 'No description provided'}</p>
              <p style="margin: 6px 0;"><strong>Type:</strong> ${task.type}</p>
            </div>
            <a href="${origin}/taskDetails?projectId=${task.projectId}&taskId=${taskId}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
              View Task
            </a>
            <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
              Stay updated with the latest changes to your tasks.
            </p>
          </div>`
        });
        console.log(`✅ Status update email sent to ${assignee.user.email} for task ${taskId}${folderContext}`);
      });
    }
  }
);

const sendNewCommentEmail = inngest.createFunction(
  { id: "send-new-comment-mail" },
  { event: "app/task.comment.added" },
  async ({ event, step }) => {
    const { taskId, commentId, commenterId, origin, taskFolder } = event.data; // UPDATED: Added taskFolder
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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
        project: {
          include: {
            workspace: {
              select: {
                name: true
              }
            }
          }
        },
        folder: { // NEW: Include folder info
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (!task || !comment || task.assignees.length === 0) return;

    // NEW: Build folder context (use provided taskFolder or fetch from task)
    const folderContext = taskFolder || (task.folder ? ` in folder "${task.folder.name}"` : '');

    for (const assignee of task.assignees) {
      if (assignee.user.id !== commenterId) {
        await step.run(`send-comment-email-${assignee.user.id}`, async () => {
          await sendEmail({
            to: assignee.user.email,
            subject: `New Comment on Task: ${task.title}`,
            body: `<div style="max-width: 600px;">
              <h2>Hi ${assignee.user.name},</h2>
              <p style="font-size: 16px;">A new comment was added to your task in <strong>${task.project.workspace.name}</strong> → <strong>${task.project.name}</strong>${folderContext}:</p>
              <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>
              <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 6px 0 10px 0;"><strong>Comment by ${comment.user.name}:</strong></p>
                <p style="margin: 0; font-style: italic; background: #f8f9fa; padding: 10px; border-radius: 4px;">${comment.content}</p>
              </div>
              <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                ${task.folder ? `<p style="margin: 6px 0;"><strong>Folder:</strong> ${task.folder.name}</p>` : ''}
                <p style="margin: 6px 0;"><strong>Task Status:</strong> ${task.status}</p>
                <p style="margin: 6px 0;"><strong>Task Type:</strong> ${task.type}</p>
                <p style="margin: 6px 0;"><strong>Due Date:</strong> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</p>
              </div>
              <a href="${origin}/taskDetails?projectId=${task.projectId}&taskId=${taskId}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                View Task & Reply
              </a>
              <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                Stay engaged with your team's discussion.
              </p>
            </div>`
          });
          console.log(`✅ Comment notification sent to ${assignee.user.email} for task ${taskId}${folderContext}`);
        });
      }
    }
  }
);

/* =========================================================
   🔹 EXPORT ALL FUNCTIONS
========================================================= */

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail,
  sendWorkspaceInvitationEmail,
  sendTaskStatusUpdateEmail,
  sendNewCommentEmail,
];