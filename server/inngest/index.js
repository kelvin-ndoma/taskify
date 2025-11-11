import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

/* =========================================================
   🔹 CLERK USER SYNC FUNCTIONS
========================================================= */

// Handle Clerk user creation - FIXED
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    try {
      console.log(`👤 Creating user: ${data.id}`);

      await prisma.user.upsert({
        where: { id: data.id },
        update: {
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
          image: data.image_url || "",
        },
        create: {
          id: data.id,
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
          image: data.image_url || "",
        },
      });

      console.log(`✅ User created: ${data.id}`);
    } catch (error) {
      console.error("❌ Error creating user:", error);
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
        where: { id: data.id }
      });
      console.log(`✅ User deleted: ${data.id}`);
    } catch (error) {
      console.error("❌ Error deleting user:", error);
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

// Workspace creation - FIXED with user creation
const syncWorkspaceCreation = inngest.createFunction(
  { id: "sync-workspace-from-clerk" },
  { event: "clerk/organization.created" },
  async ({ event }) => {
    const { data } = event;

    try {
      console.log(`🏢 Creating workspace: ${data.name}`);

      // Check if workspace already exists
      const existingWorkspace = await prisma.workspace.findUnique({
        where: { id: data.id }
      });

      if (existingWorkspace) {
        console.log(`ℹ️ Workspace ${data.id} already exists, skipping creation`);
        return;
      }

      // Ensure the owner user exists - CREATE IF MISSING
      let ownerUser = await prisma.user.findUnique({
        where: { id: data.created_by }
      });

      if (!ownerUser) {
        console.log(`👤 Owner user ${data.created_by} not found, creating user...`);
        
        // Create a minimal user record
        ownerUser = await prisma.user.create({
          data: {
            id: data.created_by,
            name: "User", // Default name since we don't have user data
            email: `${data.created_by}@temp.com`, // Temporary email
            image: "",
          },
        });
        console.log(`✅ Created temporary user: ${data.created_by}`);
      }

      // Now create the workspace
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
      
      console.log(`✅ Created workspace: ${data.name}`);
    } catch (error) {
      console.error("❌ Error creating workspace:", error);
    }
  }
);

// Workspace update - FIXED with user creation
const syncWorkspaceUpdation = inngest.createFunction(
  { id: "update-workspace-from-clerk" },
  { event: "clerk/organization.updated" },
  async ({ event }) => {
    const { data } = event;

    try {
      console.log(`🔄 Updating workspace: ${data.name}`);

      // Check if workspace exists first
      const existingWorkspace = await prisma.workspace.findUnique({
        where: { id: data.id }
      });

      if (!existingWorkspace) {
        console.log(`⚠️ Workspace ${data.id} not found, creating it...`);
        
        // Ensure the owner user exists
        let ownerUser = await prisma.user.findUnique({
          where: { id: data.created_by }
        });

        if (!ownerUser) {
          console.log(`👤 Creating missing owner user: ${data.created_by}`);
          ownerUser = await prisma.user.create({
            data: {
              id: data.created_by,
              name: "User",
              email: `${data.created_by}@temp.com`,
              image: "",
            },
          });
        }

        // Create the workspace
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
        
        console.log(`✅ Created missing workspace: ${data.name}`);
        return;
      }

      // Update existing workspace
      await prisma.workspace.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: data.slug,
          image_url: data.image_url || "",
        },
      });
      
      console.log(`✅ Updated workspace: ${data.name}`);
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

// Workspace member creation (when invitation accepted)
const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;

    try {
      // Ensure the user exists first
      let user = await prisma.user.findUnique({
        where: { id: data.user_id }
      });

      if (!user) {
        console.log(`👤 Creating missing user for membership: ${data.user_id}`);
        user = await prisma.user.create({
          data: {
            id: data.user_id,
            name: "User",
            email: `${data.user_id}@temp.com`,
            image: "",
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
      console.log(`✅ Added member to workspace: ${data.user_id}`);
    } catch (error) {
      console.error("❌ Error adding workspace member:", error);
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
];