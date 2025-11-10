import prisma from "../configs/prisma.js";

// Get all workspaces for User
export const getUserWorkspaces = async (req, res) => {
    try {
        const { userId } = await req.auth();
        
        const workspaces = await prisma.workspace.findMany({
            where: {
                members: { 
                    some: { 
                        userId: userId 
                    } 
                }
            },
            include: {
                members: { 
                    include: { 
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                            }
                        } 
                    } 
                },
                projects: {
                    include: {
                        tasks: {
                            include: {
                                assignees: { // Fixed: changed from assignee to assignees
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
                                comments: {
                                    include: {
                                        user: {
                                            select: {
                                                id: true,
                                                name: true,
                                                image: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        members: { 
                            include: { 
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                } 
                            } 
                        }
                    }
                },
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        
        res.json({ workspaces });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

// Add member to workspace
export const addMember = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { email, role, workspaceId, message } = req.body;

        // Validate input
        if (!email || !role || !workspaceId) {
            return res.status(400).json({ message: "Missing required fields: email, role, workspaceId" });
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ 
            where: { email } 
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch workspace and verify admin access
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { 
                members: true,
                owner: true
            }
        });

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }

        // Check if current user is admin or owner
        const isAdmin = workspace.members.some(
            (member) => member.userId === userId && member.role === "ADMIN"
        );
        const isOwner = workspace.ownerId === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "You don't have permission to add members" });
        }

        // Check if user is already a member (fixed logic)
        const existingMember = workspace.members.find(
            (member) => member.userId === user.id // Check the invitee, not the inviter
        );
        
        if (existingMember) {
            return res.status(400).json({ message: "User is already a member of this workspace" });
        }

        // Add member to workspace
        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,
                role,
                message: message || ""
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        });

        res.json({ 
            member, 
            message: "Member added successfully" 
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

// Create default "The Burns Brothers" workspace and add user
export const ensureDefaultWorkspace = async (userId) => {
    try {
        const defaultWorkspaceSlug = "the-burns-brothers";
        
        // Check if default workspace exists
        let workspace = await prisma.workspace.findUnique({
            where: { slug: defaultWorkspaceSlug }
        });

        // Create default workspace if it doesn't exist
        if (!workspace) {
            workspace = await prisma.workspace.create({
                data: {
                    id: `ws_${Date.now()}`,
                    name: "The Burns Brothers",
                    slug: defaultWorkspaceSlug,
                    description: "Default workspace for all users",
                    ownerId: userId, // First user becomes owner
                    settings: {
                        theme: "light",
                        defaultProject: null
                    }
                }
            });
        }

        // Check if user is already a member
        const existingMember = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: userId,
                    workspaceId: workspace.id
                }
            }
        });

        // Add user as admin if not already a member
        if (!existingMember) {
            await prisma.workspaceMember.create({
                data: {
                    userId: userId,
                    workspaceId: workspace.id,
                    role: "ADMIN",
                    message: "Auto-joined default workspace"
                }
            });
        }

        return workspace;
    } catch (error) {
        console.error("Error ensuring default workspace:", error);
        throw error;
    }
}

// Updated user creation function (to be used in your auth flow)
export const createUserWithDefaultWorkspace = async (userData) => {
    try {
        // Create user
        const user = await prisma.user.create({
            data: userData
        });

        // Add to default workspace
        await ensureDefaultWorkspace(user.id);

        return user;
    } catch (error) {
        console.error("Error creating user with default workspace:", error);
        throw error;
    }
}