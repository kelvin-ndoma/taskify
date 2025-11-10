import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

/* =========================================================
   🔹 CLERK USER SYNC FUNCTIONS
========================================================= */

// Handle Clerk user creation with auto-workspace assignment
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    try {
      // Create/update user in database
      const user = await prisma.user.upsert({
        where: { id: data.id },
        update: {
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          image: data.image_url || "",
        },
        create: {
          id: data.id,
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          image: data.image_url || "",
        },
      });

      console.log(`✅ User synced: ${user.email}`);

      // AUTO-WORKSPACE ASSIGNMENT: Add user to "The Burns Brothers" workspace
      const defaultWorkspaceSlug = "the-burns-brothers";
      
      // Check if TBB workspace exists
      let workspace = await prisma.workspace.findUnique({
        where: { slug: defaultWorkspaceSlug }
      });

      // Create TBB workspace if it doesn't exist
      if (!workspace) {
        console.log("🏢 Creating The Burns Brothers workspace...");
        
        // Find an existing admin user to be the owner, or use this user as fallback
        const adminUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { contains: "admin" } },
              { email: { contains: "burns" } }
            ]
          }
        });

        workspace = await prisma.workspace.create({
          data: {
            id: `ws_tbb_${Date.now()}`,
            name: "The Burns Brothers",
            slug: defaultWorkspaceSlug,
            description: "Default workspace for all TBB team members",
            ownerId: adminUser?.id || user.id, // Admin or first user owns it
            settings: {
              theme: "light",
              defaultProject: null
            }
          }
        });
        console.log(`✅ Created TBB workspace with owner: ${workspace.ownerId}`);
      }

      // Add user to TBB workspace as MEMBER (not admin)
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: workspace.id
          }
        }
      });

      if (!existingMember) {
        await prisma.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            role: "MEMBER", // Regular member, not admin
            message: "Auto-joined TBB workspace on sign up"
          }
        });
        console.log(`✅ Added user ${user.email} to TBB workspace as MEMBER`);
      } else {
        console.log(`ℹ️ User ${user.email} already in TBB workspace`);
      }

      return { user, workspaceAdded: !existingMember };
    } catch (error) {
      console.error("❌ Error in user sync:", error);
      throw error;
    }
  }
);

// Inngest Function to delete user from Database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;
    
    try {
      await prisma.user.delete({
        where: {
          id: data.id
        }
      });
      console.log(`✅ User deleted: ${data.id}`);
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      throw error;
    }
  }
);

// Inngest Function to Update user info into the Database
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
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          image: data.image_url || "",
        },
      });
      console.log(`✅ User updated: ${data.id}`);
    } catch (error) {
      console.error("❌ Error updating user:", error);
      throw error;
    }
  }
);

/* =========================================================
   🔹 CLERK ORGANIZATION (WORKSPACE) SYNC FUNCTIONS
========================================================= */

// Workspace creation
const syncWorkspaceCreation = inngest.createFunction(
  { id: "sync-workspace-from-clerk" },
  { event: "clerk/organization.created" },
  async ({ event }) => {
    const { data } = event;

    try {
      // Don't create if it's "The Burns Brothers" - we handle that separately
      if (data.slug === "the-burns-brothers" || data.name.toLowerCase().includes("burns brothers")) {
        console.log("ℹ️ Skipping TBB workspace creation - handled separately");
        return;
      }

      await prisma.workspace.create({
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
      
      console.log(`✅ Workspace created: ${data.name}`);
    } catch (error) {
      console.error("❌ Error creating workspace:", error);
      throw error;
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
      await prisma.workspace.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: data.slug,
          image_url: data.image_url || "",
        },
      });
      console.log(`✅ Workspace updated: ${data.id}`);
    } catch (error) {
      console.error("❌ Error updating workspace:", error);
      throw error;
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
      // Don't allow deletion of TBB workspace
      const workspace = await prisma.workspace.findUnique({
        where: { id: data.id }
      });
      
      if (workspace && workspace.slug === "the-burns-brothers") {
        console.log("🚫 Cannot delete The Burns Brothers workspace");
        return;
      }

      await prisma.workspace.delete({ where: { id: data.id } });
      console.log(`✅ Workspace deleted: ${data.id}`);
    } catch (error) {
      console.error("❌ Error deleting workspace:", error);
      throw error;
    }
  }
);

// Workspace member creation (when invitation accepted)
const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;

    try {
      await prisma.workspaceMember.create({
        data: {
          userId: data.user_id,
          workspaceId: data.organization_id,
          role: String(data.role).toUpperCase() || "MEMBER", // Fixed: use role instead of role_name
        },
      });
      console.log(`✅ Member added to workspace: ${data.user_id}`);
    } catch (error) {
      console.error("❌ Error adding workspace member:", error);
      throw error;
    }
  }
);

/* =========================================================
   🔹 TASK EMAIL NOTIFICATIONS (Updated for Multiple Assignees)
========================================================= */

const sendTaskAssignmentEmail = inngest.createFunction(
  { id: "send-task-assignment-mail" },
  { event: "app/task.assigned" },
  async ({ event, step }) => {
    const { taskId, assigneeId, origin } = event.data;

    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { 
          assignees: {
            include: {
              user: true
            }
          }, 
          project: true 
        },
      });

      if (!task) {
        console.log("❌ Task not found for email notification");
        return;
      }

      // Find the specific assignee
      const assignee = task.assignees?.find(a => a.userId === assigneeId)?.user;
      
      if (!assignee) {
        console.log("❌ Assignee not found for email notification");
        return;
      }

      // Send initial assignment email
      await sendEmail({
        to: assignee.email,
        subject: `New Task Assigned: ${task.project.name}`,
        body: `
          <div style="max-width:600px; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">Hi ${assignee.name}, 👋</h2>
            <p>You've been assigned a new task in <strong style="color: #007bff;">${task.project.name}</strong>:</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3 style="color: #007bff; margin: 0 0 10px 0;">${task.title}</h3>
              <p style="margin: 5px 0; color: #666;">${task.description || "No description provided."}</p>
              <p style="margin: 5px 0;"><strong>Due:</strong> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}</p>
              <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> ${task.status}</p>
            </div>
            <a href="${origin}" style="background: #007bff; color: #fff; padding: 12px 24px; border-radius: 5px; text-decoration: none; display: inline-block;">View Task</a>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #6c757d; font-size: 12px;">
              <p>This task has ${task.assignees?.length || 1} assignee(s) total.</p>
            </div>
          </div>
        `,
      });

      console.log(`✅ Assignment email sent to: ${assignee.email}`);

      // Schedule a reminder on the due date
      if (task.due_date) {
        await step.sleepUntil("wait-for-due-date", new Date(task.due_date));

        const refreshedTask = await prisma.task.findUnique({
          where: { id: taskId },
          include: { 
            assignees: {
              include: {
                user: true
              }
            }, 
            project: true 
          },
        });

        if (refreshedTask && refreshedTask.status !== "DONE") {
          const refreshedAssignee = refreshedTask.assignees?.find(a => a.userId === assigneeId)?.user;
          
          if (refreshedAssignee) {
            await sendEmail({
              to: refreshedAssignee.email,
              subject: `Reminder: Task Due Today in ${refreshedTask.project.name}`,
              body: `
                <div style="max-width:600px; font-family: Arial, sans-serif;">
                  <h2 style="color: #333;">Hi ${refreshedAssignee.name},</h2>
                  <p>Your task is <strong style="color: #dc3545;">due today</strong> in <strong style="color: #007bff;">${refreshedTask.project.name}</strong>:</p>
                  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #ffc107;">
                    <h3 style="color: #856404; margin: 0 0 10px 0;">${refreshedTask.title}</h3>
                    <p style="margin: 5px 0; color: #856404;">${refreshedTask.description || "No description provided."}</p>
                    <p style="margin: 5px 0;"><strong>Due:</strong> <span style="color: #dc3545;">${new Date(refreshedTask.due_date).toLocaleDateString()}</span></p>
                  </div>
                  <a href="${origin}" style="background: #dc3545; color: #fff; padding: 12px 24px; border-radius: 5px; text-decoration: none; display: inline-block;">View Task</a>
                  <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">Please review and complete your task before the deadline.</p>
                </div>
              `,
            });
            console.log(`✅ Reminder email sent to: ${refreshedAssignee.email}`);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error sending task email:", error);
      throw error;
    }
  }
);

/* =========================================================
   🔹 TASK MANAGEMENT FUNCTIONS
========================================================= */

// Function to handle task assignment to multiple users
const handleTaskAssignment = inngest.createFunction(
  { id: "handle-task-assignment" },
  { event: "app/task.created" },
  async ({ event }) => {
    const { taskId, assigneeIds, origin } = event.data;

    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignees: {
            include: {
              user: true
            }
          },
          project: true
        }
      });

      if (!task) {
        console.log("❌ Task not found for assignment handling");
        return;
      }

      console.log(`📋 Handling assignments for task: ${task.title}`);
      console.log(`👥 Assignees: ${task.assignees?.length || 0} users`);

      // Send assignment emails to all assignees
      if (task.assignees && task.assignees.length > 0) {
        for (const assignment of task.assignees) {
          await inngest.send({
            name: "app/task.assigned",
            data: {
              taskId: task.id,
              assigneeId: assignment.userId,
              origin
            }
          });
        }
      }

      console.log(`✅ Task assignment handling completed for: ${task.title}`);
    } catch (error) {
      console.error("❌ Error handling task assignment:", error);
      throw error;
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
  handleTaskAssignment,
];