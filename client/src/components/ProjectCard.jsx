import { Link } from "react-router-dom";
import { Folder, FileText, Users } from "lucide-react";

const statusColors = {
    PLANNING: "bg-gray-200 dark:bg-zinc-600 text-gray-900 dark:text-zinc-200",
    ACTIVE: "bg-emerald-200 dark:bg-emerald-500 text-emerald-900 dark:text-emerald-900",
    ON_HOLD: "bg-amber-200 dark:bg-amber-500 text-amber-900 dark:text-amber-900",
    COMPLETED: "bg-blue-200 dark:bg-blue-500 text-blue-900 dark:text-blue-900",
    CANCELLED: "bg-red-200 dark:bg-red-500 text-red-900 dark:text-red-900",
};

const ProjectCard = ({ project, stats }) => {
    // Calculate task statistics including folders
    const calculateTaskStats = () => {
        if (stats) {
            return stats; // Use passed stats if available
        }
        
        // Fallback calculation
        const folderTasks = project.folders?.flatMap(folder => folder.tasks || []) || [];
        const rootTasks = project.tasks || [];
        const allTasks = [...rootTasks, ...folderTasks];
        
        return {
            totalTasks: allTasks.length,
            totalFolders: project.folders?.length || 0,
            completedTasks: allTasks.filter(task => task.status === 'DONE').length,
            teamMembers: project.members?.length || 0,
        };
    };

    const taskStats = calculateTaskStats();

    return (
        <Link to={`/projectsDetail?id=${project.id}&tab=tasks`} className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 rounded-lg p-5 transition-all duration-200 group">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-zinc-200 mb-1 truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        {project.name}
                    </h3>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm line-clamp-2 mb-3">
                        {project.description || "No description"}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <span className={`px-2 py-0.5 rounded text-xs ${statusColors[project.status]}`} >
                    {project.status.replace("_", " ")}
                </span>
                <span className="text-xs text-gray-500 dark:text-zinc-500 capitalize">
                    {project.priority} priority
                </span>
            </div>

            {/* NEW: Project Statistics with Folders */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-zinc-400 mb-1">
                        <FileText className="size-3" />
                        Tasks
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-zinc-200">
                        {taskStats.totalTasks}
                    </div>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-zinc-400 mb-1">
                        <Folder className="size-3" />
                        Folders
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-zinc-200">
                        {taskStats.totalFolders}
                    </div>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-zinc-400 mb-1">
                        <Users className="size-3" />
                        Team
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-zinc-200">
                        {taskStats.teamMembers}
                    </div>
                </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-500">Progress</span>
                    <span className="text-gray-400 dark:text-zinc-400">{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-zinc-800 h-1.5 rounded">
                    <div 
                        className="h-1.5 rounded bg-blue-500 transition-all duration-300" 
                        style={{ width: `${project.progress || 0}%` }} 
                    />
                </div>
            </div>

            {/* NEW: Completion Rate */}
            {taskStats.totalTasks > 0 && (
                <div className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                    {taskStats.completedTasks} of {taskStats.totalTasks} tasks completed
                    ({Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100)}%)
                </div>
            )}
        </Link>
    );
};

export default ProjectCard;