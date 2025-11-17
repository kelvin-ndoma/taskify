import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
// import sendEmail from "../configs/nodemailer.js";
import sendEmail from "../configs/resend.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// 🏢 Define the default workspace ID or name
const DEFAULT_WORKSPACE_NAME = "The Burns Brothers";

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

      // Extract proper name from Clerk data
      const firstName = data.first_name || "";
      const lastName = data.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Get email from Clerk
      const email = data.email_addresses?.[0]?.email_address || "";
      
      // Generate a proper name fallback from email if no name provided
      let finalName = fullName;
      if (!finalName) {
        const emailUsername = email.split('@')[0] || "user";
        // Capitalize first letter and use the rest
        finalName = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
      }

      // If we still don't have a proper name, use a more descriptive placeholder
      if (!finalName || finalName === 'User') {
        finalName = `User ${data.id.slice(-4)}`; // e.g., "User 84u3"
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

      // 🔹 Find the default workspace
      const defaultWorkspace = await prisma.workspace.findFirst({
        where: { name: DEFAULT_WORKSPACE_NAME },
      });

      if (!defaultWorkspace) {
        console.log(
          `⚠️ Default workspace "${DEFAULT_WORKSPACE_NAME}" not found.`
        );
        return;
      }

      // 🔹 Check if user already in the default workspace
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
        console.log(
          `✅ Added ${user.name} to default workspace "${DEFAULT_WORKSPACE_NAME}"`
        );
      } else {
        console.log(`ℹ️ User already in default workspace`);
      }
    } catch (error) {
      console.error("❌ Error creating user:", error);
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
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
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

      // Ensure owner exists
      let ownerUser = await prisma.user.findUnique({
        where: { id: data.created_by },
      });

      if (!ownerUser) {
        ownerUser = await prisma.user.create({
          data: {
            id: data.created_by,
            name: "User",
            email: `${data.created_by}@temp.com`,
          },
        });
      }

      // ✅ Create workspace
      const workspace = await prisma.workspace.create({
        data: {
          id: data.id,
          name: data.name,
          slug: data.slug,
          ownerId: data.created_by,
          image_url: data.image_url || "",
        },
      });

      // ✅ Add creator as admin
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
        console.log(`⚠️ Workspace not found, creating new one`);
        await prisma.workspace.create({
          data: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            ownerId: data.created_by,
          },
        });
      } else {
        await prisma.workspace.update({
          where: { id: data.id },
          data: {
            name: data.name,
            slug: data.slug,
            image_url: data.image_url || "",
          },
        });
      }

      console.log(`✅ Workspace updated: ${data.name}`);
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

      // First, try to get the user from Clerk's data or find existing user
      let user = await prisma.user.findUnique({ 
        where: { id: data.user_id } 
      });

      if (!user) {
        console.log(`ℹ️ User ${data.user_id} not found in database, creating from Clerk data`);
        
        // Create user with available data from the invitation
        user = await prisma.user.create({
          data: {
            id: data.user_id,
            name: data.public_user_data?.first_name && data.public_user_data?.last_name 
              ? `${data.public_user_data.first_name} ${data.public_user_data.last_name}`.trim()
              : "User",
            email: data.public_user_data?.email_addresses?.[0]?.email_address || `${data.user_id}@temp.com`,
          },
        });
        console.log(`✅ Created user from invitation: ${user.name} (${user.email})`);
      } else {
        console.log(`✅ Found existing user: ${user.name} (${user.email})`);
      }

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

// Sync user data when they accept workspace invitations
const syncUserFromInvitation = inngest.createFunction(
  { id: "sync-user-from-invitation" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;

    try {
      console.log(`🔄 Syncing user data for: ${data.user_id}`);

      // Update user with available data from the invitation
      const user = await prisma.user.upsert({
        where: { id: data.user_id },
        update: {
          name: data.public_user_data?.first_name && data.public_user_data?.last_name 
            ? `${data.public_user_data.first_name} ${data.public_user_data.last_name}`.trim()
            : undefined,
          email: data.public_user_data?.email_addresses?.[0]?.email_address || undefined,
        },
        create: {
          id: data.user_id,
          name: data.public_user_data?.first_name && data.public_user_data?.last_name 
            ? `${data.public_user_data.first_name} ${data.public_user_data.last_name}`.trim()
            : "User",
          email: data.public_user_data?.email_addresses?.[0]?.email_address || `${data.user_id}@temp.com`,
        },
      });

      console.log(`✅ User data synced: ${user.name} (${user.email})`);

    } catch (error) {
      console.error("❌ Error syncing user data from invitation:", error);
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
    
    // Fetch task with specific assignee
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
    
    // Send assignment email
    await step.run('send-assignment-email', async () => {
      await sendEmail({
        to: assignment.user.email,
        subject: `New Task Assignment in ${task.project.name}`,
        body: `<div style="max-width: 600px;">
          <h2>Hi ${assignment.user.name},</h2>
          <p style="font-size: 16px;">You've been assigned a new task in <strong>${task.project.workspace.name}</strong> → <strong>${task.project.name}</strong>:</p>
          <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>
          <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
            <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description || 'No description provided'}</p>
            <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
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
      console.log(`✅ Assignment email sent to ${assignment.user.email} for task ${taskId}`);
    });

    // Schedule reminder if due date is in the future
    const dueDate = new Date(task.due_date);
    const today = new Date();
    
    if (dueDate > today) {
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

        // UPDATED: Check for both DONE and CANCELLED status
        if (!updatedTask || updatedTask.status === "DONE" || updatedTask.status === "CANCELLED") {
          console.log(`Task ${taskId} is completed or cancelled, skipping reminder`);
          return;
        }

        // Send reminder email
        await step.run('send-reminder-email', async () => {
          await sendEmail({
            to: assignment.user.email,
            subject: `Reminder: Task Due Today - ${updatedTask.project.name}`,
            body: `<div style="max-width: 600px;">
              <h2>Hi ${assignment.user.name},</h2>
              <p style="font-size: 16px;">You have a task due today in <strong>${updatedTask.project.workspace.name}</strong> → <strong>${updatedTask.project.name}</strong>:</p>
              <p style="font-size: 18px; font-weight: bold; color: #dc3545; margin: 8px 0;">${updatedTask.title}</p>
              <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                <p style="margin: 6px 0;"><strong>Description:</strong> ${updatedTask.description || 'No description provided'}</p>
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
          console.log(`✅ Reminder email sent to ${assignment.user.email} for task ${taskId}`);
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
      // Get workspace details
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          owner: true,
        },
      });

      if (!workspace) {
        console.error(`❌ Workspace not found: ${workspaceId}`);
        return;
      }

      console.log(`📧 Sending workspace invitation to: ${inviteeEmail}`);

      await sendEmail({
        to: inviteeEmail,
        subject: `You've been invited to join ${workspace.name}`,
        body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #333; margin-bottom: 10px;">🏢 Workspace Invitation</h1>
                  <p style="color: #666; font-size: 16px;">You've been invited to join a workspace</p>
                </div>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                  <h2 style="color: #007bff; margin: 0 0 15px 0;">${workspace.name}</h2>
                  
                  <div style="margin: 15px 0;">
                    <p style="color: #555; margin: 0; line-height: 1.5;">
                      <strong>${inviterName}</strong> has invited you to join the <strong>${
                        workspace.name
                      }</strong> workspace as a <strong>${role}</strong>.
                    </p>
                  </div>
                  
                  ${
                    workspace.description
                      ? `
                  <div style="margin: 15px 0;">
                    <strong style="color: #333;">Workspace Description:</strong>
                    <p style="color: #555; margin: 5px 0 0 0; line-height: 1.5;">${workspace.description}</p>
                  </div>
                  `
                      : ""
                  }
                  
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
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <p style="color: #666; margin-bottom: 15px;">
                    To accept this invitation, please log in to your account:
                  </p>
                  <a href="${origin}" 
                    style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Go to App
                  </a>
                </div>

                <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    If you believe you received this invitation by mistake, please ignore this email.
                  </p>
                </div>
              </div>
                      `,  
      });

      console.log(`✅ Workspace invitation email sent to: ${inviteeEmail}`);
    } catch (error) {
      console.error("❌ Error sending workspace invitation email:", error);
    }
  }
);

/* =========================================================
   🔹 NEW EVENTS FOR TASK UPDATES AND COMMENTS
========================================================= */

// Send email when task status changes
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
        }
      }
    });

    if (!task || task.assignees.length === 0) return;

    const updater = await prisma.user.findUnique({
      where: { id: updaterId },
      select: { name: true }
    });

    // Send emails to all assignees
    for (const assignee of task.assignees) {
      await step.run(`send-status-update-email-${assignee.user.id}`, async () => {
        await sendEmail({
          to: assignee.user.email,
          subject: `Task Status Updated: ${task.title}`,
          body: `<div style="max-width: 600px;">
            <h2>Hi ${assignee.user.name},</h2>
            <p style="font-size: 16px;">The status of your task in <strong>${task.project.workspace.name}</strong> → <strong>${task.project.name}</strong> has been updated:</p>
            <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>
            <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
              <p style="margin: 6px 0;"><strong>Status Changed:</strong> ${oldStatus} → <strong>${newStatus}</strong></p>
              <p style="margin: 6px 0;"><strong>Updated By:</strong> ${updater?.name || "Team Member"}</p>
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
        console.log(`✅ Status update email sent to ${assignee.user.email} for task ${taskId}`);
      });
    }
  }
);

// Send email when new comment is added
const sendNewCommentEmail = inngest.createFunction(
  { id: "send-new-comment-mail" },
  { event: "app/task.comment.added" },
  async ({ event, step }) => {
    const { taskId, commentId, commenterId, origin } = event.data;
    
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

    // Send emails to all assignees except the commenter
    for (const assignee of task.assignees) {
      if (assignee.user.id !== commenterId) { // Don't email the commenter
        await step.run(`send-comment-email-${assignee.user.id}`, async () => {
          await sendEmail({
            to: assignee.user.email,
            subject: `New Comment on Task: ${task.title}`,
            body: `<div style="max-width: 600px;">
              <h2>Hi ${assignee.user.name},</h2>
              <p style="font-size: 16px;">A new comment was added to your task in <strong>${task.project.workspace.name}</strong> → <strong>${task.project.name}</strong>:</p>
              <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>
              <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 6px 0 10px 0;"><strong>Comment by ${comment.user.name}:</strong></p>
                <p style="margin: 0; font-style: italic; background: #f8f9fa; padding: 10px; border-radius: 4px;">${comment.content}</p>
              </div>
              <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 6px 0;"><strong>Task Status:</strong> ${task.status}</p>
                <p style="margin: 6px 0;"><strong>Task Type:</strong> ${task.type}</p>
                <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
              </div>
              <a href="${origin}/taskDetails?projectId=${task.projectId}&taskId=${taskId}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                View Task & Reply
              </a>
              <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                Stay engaged with your team's discussion.
              </p>
            </div>`
          });
          console.log(`✅ Comment notification sent to ${assignee.user.email} for task ${taskId}`);
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
  syncUserFromInvitation,
  sendTaskAssignmentEmail,
  sendWorkspaceInvitationEmail,
  sendTaskStatusUpdateEmail,
  sendNewCommentEmail,
];