import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

/* =========================================================
   🔹 CLERK USER SYNC FUNCTIONS
========================================================= */

// Handle Clerk user creation
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const user = event.data;

    await prisma.user.upsert({
      data: {
        id: user.id,
        email: data?.email_addresses?.[0]?.email_address,
        name: data?.first_name + "" + data?.last_name,
        image: data?.image_url,
      },
    });
  }
);

// Inngest Function to delete user from Database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const {data} = event;
    await prisma.user.delete({
      where: {
        id: data.id
      }
    })
  }
);

// Inngest Function to Update user info into the Database
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const {data} = event;
    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data?.email_addresses?.[0]?.email_address,
        name: data?.first_name + "" + data?.last_name,
        image: data?.image_url,
      },
    });
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

    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
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
  }
);

// Workspace update
const syncWorkspaceUpdation = inngest.createFunction(
  { id: "update-workspace-from-clerk" },
  { event: "clerk/organization.updated" },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      },
    });
  }
);

// Workspace deletion
const syncWorkspaceDeletion = inngest.createFunction(
  { id: "delete-workspace-with-clerk" },
  { event: "clerk/organization.deleted" },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.delete({ where: { id: data.id } });
  }
);

// Workspace member creation (when invitation accepted)
const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toUpperCase(),
      },
    });
  }
);

/* =========================================================
   🔹 TASK EMAIL NOTIFICATIONS
========================================================= */

// const sendTaskAssignmentEmail = inngest.createFunction(
//   { id: "send-task-assignment-mail" },
//   { event: "app/task.assigned" },
//   async ({ event, step }) => {
//     const { taskId, origin } = event.data;

//     const task = await prisma.task.findUnique({
//       where: { id: taskId },
//       include: { assignee: true, project: true },
//     });

//     if (!task || !task.assignee) return;

//     // Send initial assignment email
//     await sendEmail({
//       to: task.assignee.email,
//       subject: `New Task Assigned: ${task.project.name}`,
//       body: `
//         <div style="max-width:600px;">
//           <h2>Hi ${task.assignee.name}, 👋</h2>
//           <p>You’ve been assigned a new task in <strong>${task.project.name}</strong>:</p>
//           <p style="font-size:18px;font-weight:bold;color:#007bff;">${task.title}</p>
//           <p>${task.description || "No description provided."}</p>
//           <p><strong>Due:</strong> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}</p>
//           <a href="${origin}" style="background:#007bff;color:#fff;padding:12px 24px;border-radius:5px;text-decoration:none;">View Task</a>
//         </div>
//       `,
//     });

//     // Schedule a reminder on the due date
//     if (task.due_date) {
//       await step.sleepUntil("wait-for-due-date", new Date(task.due_date));

//       const refreshedTask = await prisma.task.findUnique({
//         where: { id: taskId },
//         include: { assignee: true, project: true },
//       });

//       if (refreshedTask && refreshedTask.status !== "DONE") {
//         await sendEmail({
//           to: refreshedTask.assignee.email,
//           subject: `Reminder: Task Due in ${refreshedTask.project.name}`,
//           body: `
//             <div style="max-width:600px;">
//               <h2>Hi ${refreshedTask.assignee.name},</h2>
//               <p>Your task is due today in <strong>${refreshedTask.project.name}</strong>:</p>
//               <p style="font-size:18px;font-weight:bold;color:#007bff;">${refreshedTask.title}</p>
//               <p><strong>Due:</strong> ${new Date(refreshedTask.due_date).toLocaleDateString()}</p>
//               <a href="${origin}" style="background:#007bff;color:#fff;padding:12px 24px;border-radius:5px;text-decoration:none;">View Task</a>
//               <p style="margin-top:20px;font-size:14px;color:#6c757d;">Please review and complete your task before the deadline.</p>
//             </div>
//           `,
//         });
//       }
//     }
//   }
// );

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
  // sendTaskAssignmentEmail,
];
