zU)jqbW2@vC@+6V

// controllers/taskController.js
import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// Create task
export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const origin = req.get('origin');

        const {
            projectId,
            title,
            description,
            type,
            status,
            priority,
            assignees = [], // Array of user IDs
            due_date
        } = req.body;

        // Check if user has admin role for project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { 
                members: { include: { user: true } },
                workspace: {
                    include: {
                        members: true
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        // Check permissions - workspace admin OR project team lead OR project member
        const isWorkspaceAdmin = project.workspace.members.some(
            member => member.userId === userId && member.role === "ADMIN"
        );
        const isProjectLead = project.team_lead === userId;
        const isProjectMember = project.members.some(member => member.userId === userId);

        if (!isWorkspaceAdmin && !isProjectLead && !isProjectMember) {
            return res.status(403).json({ message: "You don't have permission to create tasks in this project." });
        }

        // Validate assignees are project members
        if (assignees.length > 0) {
            const invalidAssignees = [];
            for (const assigneeId of assignees) {
                const isValidAssignee = project.members.some(member => member.userId === assigneeId);
                if (!isValidAssignee) {
                    invalidAssignees.push(assigneeId);
                }
            }
            if (invalidAssignees.length > 0) {
                return res.status(400).json({ message: `Some assignees are not project members.` });
            }
        }

        // Create task with transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the task
            const task = await tx.task.create({
                data: {
                    projectId,
                    title,
                    description,
                    type,
                    priority,
                    status,
                    due_date: due_date ? new Date(due_date) : null
                }
            });

            // Create task assignees if provided
            if (assignees.length > 0) {
                await tx.taskAssignee.createMany({
                    data: assignees.map(assigneeId => ({
                        taskId: task.id,
                        userId: assigneeId
                    }))
                });
            }

            // Return task with full details
            return await tx.task.findUnique({
                where: { id: task.id },
                include: {
                    assignees: {
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
                    project: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
        });

        // Send email notifications to all assignees
        if (result.assignees && result.assignees.length > 0) {
            for (const assignee of result.assignees) {
                await inngest.send({
                    name: "app/task.assigned",
                    data: {
                        taskId: result.id,
                        assigneeId: assignee.userId,
                        origin
                    }
                });
            }
        }

        res.json({ task: result, message: "Task created successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.code || error.message });
    }
};

// Update task
export const updateTask = async (req, res) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: req.params.id },
            include: {
                assignees: true,
                project: {
                    include: {
                        workspace: {
                            include: {
                                members: true
                            }
                        },
                        members: true
                    }
                }
            }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const { userId } = await req.auth();
        const {
            title,
            description,
            type,
            status,
            priority,
            assignees, // Array of user IDs
            due_date
        } = req.body;

        // Check permissions
        const isWorkspaceAdmin = task.project.workspace.members.some(
            member => member.userId === userId && member.role === "ADMIN"
        );
        const isProjectLead = task.project.team_lead === userId;
        const isTaskAssignee = task.assignees.some(assignee => assignee.userId === userId);

        if (!isWorkspaceAdmin && !isProjectLead && !isTaskAssignee) {
            return res.status(403).json({ message: "You don't have permission to update this task." });
        }

        // Validate new assignees if provided
        if (assignees && assignees.length > 0) {
            const invalidAssignees = [];
            for (const assigneeId of assignees) {
                const isValidAssignee = task.project.members.some(member => member.userId === assigneeId);
                if (!isValidAssignee) {
                    invalidAssignees.push(assigneeId);
                }
            }
            if (invalidAssignees.length > 0) {
                return res.status(400).json({ message: `Some assignees are not project members.` });
            }
        }

        // Update task with transaction
        const updatedTask = await prisma.$transaction(async (tx) => {
            // Update basic task fields
            const taskUpdate = await tx.task.update({
                where: { id: req.params.id },
                data: {
                    ...(title && { title }),
                    ...(description !== undefined && { description }),
                    ...(type && { type }),
                    ...(status && { status }),
                    ...(priority && { priority }),
                    ...(due_date && { due_date: new Date(due_date) }),
                    updatedAt: new Date()
                }
            });

            // Update assignees if provided
            if (assignees) {
                // Remove existing assignees
                await tx.taskAssignee.deleteMany({
                    where: { taskId: req.params.id }
                });

                // Add new assignees
                if (assignees.length > 0) {
                    await tx.taskAssignee.createMany({
                        data: assignees.map(assigneeId => ({
                            taskId: req.params.id,
                            userId: assigneeId
                        }))
                    });
                }
            }

            // Return updated task with full details
            return await tx.task.findUnique({
                where: { id: req.params.id },
                include: {
                    assignees: {
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
                    project: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
        });

        res.json({ task: updatedTask, message: "Task updated successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.code || error.message });
    }
};

// Delete task 
export const deleteTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { tasksIds } = req.body;

        const tasks = await prisma.task.findMany({
            where: { id: { in: tasksIds } },
            include: {
                project: {
                    include: {
                        workspace: {
                            include: {
                                members: true
                            }
                        }
                    }
                }
            }
        });

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Task not found." });
        }

        // Check if all tasks belong to the same project
        const projectIds = [...new Set(tasks.map(task => task.projectId))];
        if (projectIds.length > 1) {
            return res.status(400).json({ message: "All tasks must belong to the same project." });
        }

        const project = tasks[0].project;

        // Check permissions - only project lead or workspace admin can delete
        const isProjectLead = project.team_lead === userId;
        const isWorkspaceAdmin = project.workspace.members.some(
            member => member.userId === userId && member.role === "ADMIN"
        );

        if (!isProjectLead && !isWorkspaceAdmin) {
            return res.status(403).json({ message: "You don't have permission to delete tasks from this project." });
        }

        await prisma.task.deleteMany({
            where: { id: { in: tasksIds } }
        });

        res.json({ message: "Task deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.code || error.message });
    }
};