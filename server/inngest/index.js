import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// 🏢 Define the default workspace ID or name
const DEFAULT_WORKSPACE_NAME = "The Burns Brothers";

/* =========================================================
   🔹 CLERK USER SYNC FUNCTIONS
========================================================= */

// Handle Clerk user creation
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    try {
      console.log(`👤 Creating user: ${data.id}`);

      // Create or update the user
      const user = await prisma.user.upsert({
        where: { id: data.id },
        update: {
          email: data.email_addresses?.[0]?.email_address || "",
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
          image: data.image_url || "",
        },
        create: {
          id: data.id,
          email: data.email_addresses?.[0]?.email_address || "",
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
          image: data.image_url || "",
        },
      });

      console.log(`✅ User created: ${user.id}`);

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
          `✅ Added ${user.id} to default workspace "${DEFAULT_WORKSPACE_NAME}"`
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
      let user = await prisma.user.findUnique({ where: { id: data.user_id } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: data.user_id,
            name: "User",
            email: `${data.user_id}@temp.com`,
          },
        });
      }

      await prisma.workspaceMember.create({
        data: {
          userId: data.user_id,
          workspaceId: data.organization_id,
          role: String(data.role).toUpperCase() || "MEMBER",
        },
      });

      console.log(
        `✅ Added ${data.user_id} to workspace ${data.organization_id}`
      );
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
    console.log('🎯 Inngest function triggered:', event.name);
    console.log('📦 Event data:', JSON.stringify(event.data, null, 2));
    
    const { taskId, assigneeId, origin } = event.data;

    try {
      console.log(`🔍 Looking up task: ${taskId} for assignee: ${assigneeId}`);

      // Get task with assignee details
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

      console.log(`📋 Task found:`, task ? 'Yes' : 'No');
      if (task) {
        console.log(`👥 Task assignees:`, task.assignees.length);
        console.log(`🏢 Project:`, task.project?.name);
      }

      if (!task) {
        console.error(`❌ Task not found: ${taskId}`);
        return;
      }

      // Find the specific assignee
      const assignee = task.assignees.find(a => a.userId === assigneeId);
      console.log(`👤 Assignee found:`, assignee ? 'Yes' : 'No');
      
      if (!assignee || !assignee.user) {
        console.error(`❌ Assignee not found for task: ${taskId}`);
        return;
      }

      console.log(`📧 Preparing to send email to: ${assignee.user.email}`);

      // Test email configuration first
      console.log(`🔄 Testing email configuration...`);
      
      await sendEmail({
        to: assignee.user.email,
        subject: `New Task Assignment in ${task.project.name}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin-bottom: 10px;">🎯 New Task Assignment</h1>
              <p style="color: #666; font-size: 16px;">You've been assigned a new task in ${task.project.name}</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
              <h2 style="color: #007bff; margin: 0 0 10px 0;">${task.title}</h2>
              <p><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
            </div>
          </div>
        `,
      });

      console.log(`✅ Email sent successfully to: ${assignee.user.email}`);

      // Rest of your reminder logic...
      
    } catch (error) {
      console.error('❌ Error in sendTaskAssignmentEmail:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
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
];
