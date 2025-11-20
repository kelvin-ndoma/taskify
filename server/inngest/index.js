import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/resend.js";

export const inngest = new Inngest({ id: "project-management" });

const DEFAULT_WORKSPACE_NAME = "The Burns Brothers";
const DEFAULT_WORKSPACE_SLUG = "the-burns-brothers";

/* =========================================================
   🔹 CLERK USER SYNC FUNCTIONS
========================================================= */

// Real user creation/updating ONLY from Clerk
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;
    try {
      const firstName = data.first_name || "";
      const lastName = data.last_name || "";
      const email = data.email_addresses?.[0]?.email_address || "";
      let finalName = `${firstName} ${lastName}`.trim() || email.split('@')[0];
      if (!finalName) finalName = `User ${data.id.slice(-4)}`;

      const user = await prisma.user.upsert({
        where: { id: data.id },
        update: { email, name: finalName, image: data.image_url || "" },
        create: { id: data.id, email, name: finalName, image: data.image_url || "" },
      });

      let defaultWorkspace = await prisma.workspace.findFirst({
        where: {
          OR: [{ slug: DEFAULT_WORKSPACE_SLUG }, { name: DEFAULT_WORKSPACE_NAME }]
        }
      });
      if (!defaultWorkspace) {
        defaultWorkspace = await prisma.workspace.create({
          data: {
            id: `org_${Math.random().toString(36).slice(2, 11)}`,
            name: DEFAULT_WORKSPACE_NAME,
            slug: DEFAULT_WORKSPACE_SLUG,
            ownerId: user.id,
            description: "Default workspace for all users"
          }
        });
        await prisma.workspaceMember.create({
          data: { userId: user.id, workspaceId: defaultWorkspace.id, role: "ADMIN" }
        });
      } else {
        const member = await prisma.workspaceMember.findFirst({
          where: { userId: user.id, workspaceId: defaultWorkspace.id }
        });
        if (!member) {
          await prisma.workspaceMember.create({
            data: { userId: user.id, workspaceId: defaultWorkspace.id, role: "MEMBER" }
          });
        }
      }
    } catch (error) {
      console.error("❌ Error syncing user from Clerk:", error);
    }
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;
    try {
      await prisma.user.delete({ where: { id: data.id } });
    } catch (error) {
      console.error("❌ Error deleting user from Clerk:", error);
    }
  }
);

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
    } catch (error) {
      console.error("❌ Error updating user from Clerk:", error);
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
      const exists = await prisma.workspace.findUnique({ where: { id: data.id } });
      if (exists) return;
      const owner = await prisma.user.findUnique({ where: { id: data.created_by } });
      if (!owner) {
        console.warn(`Owner user ${data.created_by} missing; workspace creation deferred`);
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
      await prisma.workspaceMember.create({
        data: {
          userId: data.created_by,
          workspaceId: data.id,
          role: "ADMIN",
        },
      });
    } catch (error) {
      console.error("❌ Error syncing workspace from Clerk:", error);
    }
  }
);

const syncWorkspaceUpdation = inngest.createFunction(
  { id: "update-workspace-from-clerk" },
  { event: "clerk/organization.updated" },
  async ({ event }) => {
    const { data } = event;
    try {
      const workspace = await prisma.workspace.findUnique({ where: { id: data.id } });
      if (!workspace) {
        const owner = await prisma.user.findUnique({ where: { id: data.created_by } });
        if (!owner) {
          console.warn(`Owner user ${data.created_by} missing; workspace creation deferred`);
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
        return;
      }
      await prisma.workspace.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: data.slug,
          image_url: data.image_url || "",
        },
      });
    } catch (error) {
      console.error("❌ Error updating workspace from Clerk:", error);
    }
  }
);

const syncWorkspaceDeletion = inngest.createFunction(
  { id: "delete-workspace-with-clerk" },
  { event: "clerk/organization.deleted" },
  async ({ event }) => {
    const { data } = event;
    try {
      await prisma.workspace.delete({ where: { id: data.id } });
    } catch (error) {
      console.error("❌ Error deleting workspace from Clerk:", error);
    }
  }
);

/* =========================================================
   🔹 CLERK INVITATION ACCEPT HANDLERS
========================================================= */

const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;
    try {
      const user = await prisma.user.findUnique({ where: { id: data.user_id } });
      if (!user) {
        console.warn(`User ${data.user_id} not yet created; will sync later`);
        return;
      }
      await prisma.workspaceMember.create({
        data: {
          userId: data.user_id,
          workspaceId: data.organization_id,
          role: (String(data.role || "").toUpperCase() === "ADMIN") ? "ADMIN" : "MEMBER",
        },
      });
    } catch (error) {
      console.error("❌ Error syncing member to workspace from Clerk:", error);
    }
  }
);

const syncUserFromInvitation = inngest.createFunction(
  { id: "sync-user-from-invitation" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;
    if (!(data?.public_user_data?.email_addresses && data.user_id)) return;
    try {
      await prisma.user.upsert({
        where: { id: data.user_id },
        update: {
          name: data.public_user_data?.first_name && data.public_user_data?.last_name
            ? `${data.public_user_data.first_name} ${data.public_user_data.last_name}`.trim()
            : undefined,
          email: data.public_user_data.email_addresses[0]?.email_address || undefined,
        },
        create: {
          id: data.user_id,
          name: data.public_user_data?.first_name && data.public_user_data?.last_name
            ? `${data.public_user_data.first_name} ${data.public_user_data.last_name}`.trim()
            : "User",
          email: data.public_user_data.email_addresses[0]?.email_address || undefined,
        },
      });
    } catch (error) {
      console.error("❌ Error syncing user data from invitation:", error);
    }
  }
);

/* =========================================================
   🔹 WORKSPACE INVITATION EMAIL SENDER
========================================================= */

const sendWorkspaceInvitationEmail = inngest.createFunction(
  { id: "send-workspace-invitation-mail" },
  { event: "app/workspace.invitation" },
  async ({ event }) => {
    const { workspaceId, inviteeEmail, inviterName, origin, role } = event.data;
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { owner: true },
      });
      if (!workspace) {
        console.error(`❌ Workspace not found: ${workspaceId}`);
        return;
      }
      await sendEmail({
        to: inviteeEmail,
        subject: `You've been invited to join ${workspace.name}`,
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
          <strong>${inviterName}</strong> has invited you to join the <strong>${workspace.name}</strong> workspace as a <strong>${role}</strong>.
        </div>`,
      });
    } catch (error) {
      console.error("❌ Error sending workspace invitation email:", error);
    }
  }
);

/* =========================================================
   🔹 TASK/COMMENT EMAIL NOTIFICATIONS
========================================================= */

const sendTaskStatusUpdateEmail = inngest.createFunction(
  { id: "send-task-status-update-mail" },
  { event: "app/task.status.updated" },
  async ({ event, step }) => {
    const { taskId, oldStatus, newStatus, updaterId, origin } = event.data;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true }}}},
        project: { include: { workspace: { select: { name: true }} }}
      }
    });
    if (!task || task.assignees.length === 0) return;
    const updater = await prisma.user.findUnique({
      where: { id: updaterId },
      select: { name: true }
    });
    for (const assignee of task.assignees) {
      await step.run(`send-status-update-email-${assignee.user.id}`, async () => {
        await sendEmail({
          to: assignee.user.email,
          subject: `Task Status Updated: ${task.title}`,
          body: `<div style="max-width: 600px;">
            <h2>Hi ${assignee.user.name},</h2>
            <p>The status of your task in <strong>${task.project.workspace.name}</strong> → <strong>${task.project.name}</strong> has been updated.</p>
            <p><strong>Status Changed:</strong> ${oldStatus} → <strong>${newStatus}</strong></p>
            <p><strong>Updated By:</strong> ${updater?.name || "Team Member"}</p>
          </div>`
        });
      });
    }
  }
);

const sendNewCommentEmail = inngest.createFunction(
  { id: "send-new-comment-mail" },
  { event: "app/task.comment.added" },
  async ({ event, step }) => {
    const { taskId, commentId, commenterId, origin } = event.data;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true }}}},
        project: { include: { workspace: { select: { name: true }} }}
      }
    });
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { user: { select: { name: true } } }
    });
    if (!task || !comment || task.assignees.length === 0) return;
    for (const assignee of task.assignees) {
      if (assignee.user.id !== commenterId) {
        await step.run(`send-comment-email-${assignee.user.id}`, async () => {
          await sendEmail({
            to: assignee.user.email,
            subject: `New Comment on Task: ${task.title}`,
            body: `<div style="max-width: 600px;">
              <h2>Hi ${assignee.user.name},</h2>
              <p>A new comment was added to your task in <strong>${task.project.workspace.name}</strong> → <strong>${task.project.name}</strong>.</p>
              <p><strong>Comment by ${comment.user.name}:</strong> "${comment.content}"</p>
            </div>`
          });
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
  sendWorkspaceInvitationEmail,
  sendTaskStatusUpdateEmail,
  sendNewCommentEmail,
];
