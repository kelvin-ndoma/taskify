import { FolderOpen, CheckCircle, Users, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useUser } from "@clerk/clerk-react";

export default function StatsGrid() {
    const currentWorkspace = useSelector(
        (state) => state?.workspace?.currentWorkspace || null
    );
    const { user } = useUser();

    const [stats, setStats] = useState({
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        myTasks: 0,
        overdueIssues: 0,
    });

    const statCards = [
        {
            icon: FolderOpen,
            title: "Total Projects",
            value: stats.totalProjects,
            subtitle: `projects in ${currentWorkspace?.name}`,
            bgColor: "bg-blue-500/10",
            textColor: "text-blue-500",
        },
        {
            icon: CheckCircle,
            title: "Active Projects",
            value: stats.activeProjects,
            subtitle: `of ${stats.totalProjects} total`,
            bgColor: "bg-emerald-500/10",
            textColor: "text-emerald-500",
        },
        {
            icon: Users,
            title: "My Tasks",
            value: stats.myTasks,
            subtitle: "assigned to me",
            bgColor: "bg-purple-500/10",
            textColor: "text-purple-500",
        },
        {
            icon: AlertTriangle,
            title: "Overdue",
            value: stats.overdueIssues,
            subtitle: "need attention",
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-500",
        },
    ];

    useEffect(() => {
        if (currentWorkspace && user) {
            const now = new Date();
            
            // Calculate all tasks across all projects
            const allTasks = currentWorkspace.projects.reduce((acc, project) => {
                return [...acc, ...(project.tasks || [])];
            }, []);

            // Calculate tasks assigned to current user
            const myTasks = allTasks.filter(task => {
                // Check if task has assignees and if current user is one of them
                return task.assignees?.some(assignee => assignee.user?.id === user.id);
            }).length;

            // Calculate overdue tasks (due date passed and not completed)
            const overdueTasks = allTasks.filter(task => {
                if (!task.due_date) return false;
                const dueDate = new Date(task.due_date);
                const isOverdue = dueDate < now;
                const isNotCompleted = task.status !== 'DONE';
                return isOverdue && isNotCompleted;
            }).length;

            setStats({
                totalProjects: currentWorkspace.projects.length,
                activeProjects: currentWorkspace.projects.filter(
                    (p) => p.status === "ACTIVE" || p.status === "PLANNING"
                ).length,
                completedProjects: currentWorkspace.projects.filter(
                    (p) => p.status === "COMPLETED"
                ).length,
                myTasks: myTasks,
                overdueIssues: overdueTasks,
            });

            // Debug logging
            console.log('📊 Dashboard Stats:', {
                totalProjects: currentWorkspace.projects.length,
                activeProjects: currentWorkspace.projects.filter(p => p.status === "ACTIVE" || p.status === "PLANNING").length,
                completedProjects: currentWorkspace.projects.filter(p => p.status === "COMPLETED").length,
                myTasks,
                overdueTasks,
                allTasksCount: allTasks.length,
                currentUserId: user.id,
                workspaceName: currentWorkspace.name
            });
        }
    }, [currentWorkspace, user]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-9">
            {statCards.map(
                ({ icon: Icon, title, value, subtitle, bgColor, textColor }, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition duration-200 rounded-md" >
                        <div className="p-6 py-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                                        {title}
                                    </p>
                                    <p className="text-3xl font-bold text-zinc-800 dark:text-white">
                                        {value}
                                    </p>
                                    {subtitle && (
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                                <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20`}>
                                    <Icon size={20} className={textColor} />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}