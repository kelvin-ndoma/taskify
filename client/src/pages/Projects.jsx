import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Plus, Search, FolderOpen, Folder } from "lucide-react";
import ProjectCard from "../components/ProjectCard";
import CreateProjectDialog from "../components/CreateProjectDialog";

export default function Projects() {
    
    const projects = useSelector(
        (state) => state?.workspace?.currentWorkspace?.projects || []
    );

    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: "ALL",
        priority: "ALL",
    });

    // FIX: Use useMemo for filtered projects instead of useEffect
    const filteredProjects = useMemo(() => {
        let filtered = projects;

        if (searchTerm) {
            filtered = filtered.filter(
                (project) =>
                    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filters.status !== "ALL") {
            filtered = filtered.filter((project) => project.status === filters.status);
        }

        if (filters.priority !== "ALL") {
            filtered = filtered.filter(
                (project) => project.priority === filters.priority
            );
        }

        return filtered;
    }, [projects, searchTerm, filters.status, filters.priority]);

    // NEW: Calculate project statistics including folders
    const getProjectStats = (project) => {
        const folderTasks = project.folders?.flatMap(folder => folder.tasks || []) || [];
        const rootTasks = project.tasks || [];
        const allTasks = [...rootTasks, ...folderTasks];
        
        return {
            totalTasks: allTasks.length,
            totalFolders: project.folders?.length || 0,
            completedTasks: allTasks.filter(task => task.status === 'DONE').length,
            inProgressTasks: allTasks.filter(task => task.status === 'IN_PROGRESS').length,
        };
    };

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        return {
            totalProjects: filteredProjects.length,
            totalFolders: filteredProjects.reduce((total, project) => total + (project.folders?.length || 0), 0),
            totalTasks: filteredProjects.reduce((total, project) => {
                const stats = getProjectStats(project);
                return total + stats.totalTasks;
            }, 0),
            completedTasks: filteredProjects.reduce((total, project) => {
                const stats = getProjectStats(project);
                return total + stats.completedTasks;
            }, 0),
        };
    }, [filteredProjects]);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1"> Projects </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Manage and track your projects </p>
                </div>
                <button 
                    onClick={() => setIsDialogOpen(true)} 
                    className="flex items-center px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:opacity-90 transition"
                >
                    <Plus className="size-4 mr-2" /> New Project
                </button>
                <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 w-4 h-4" />
                    <input 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        value={searchTerm} 
                        className="w-full pl-10 text-sm pr-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:border-blue-500 outline-none" 
                        placeholder="Search projects..." 
                    />
                </div>
                <select 
                    value={filters.status} 
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })} 
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white text-sm"
                >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PLANNING">Planning</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                <select 
                    value={filters.priority} 
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })} 
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white text-sm"
                >
                    <option value="ALL">All Priority</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                </select>
            </div>

            {/* Projects Summary Stats - NEW */}
            {filteredProjects.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {summaryStats.totalProjects}
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">Projects</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {summaryStats.totalFolders}
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center justify-center gap-1">
                                <Folder className="size-4" /> Folders
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {summaryStats.totalTasks}
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Tasks</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {summaryStats.completedTasks}
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">Completed</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <FolderOpen className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            No projects found
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6 text-sm">
                            {projects.length === 0 
                                ? "Create your first project to get started" 
                                : "No projects match your search criteria"
                            }
                        </p>
                        <button 
                            onClick={() => setIsDialogOpen(true)} 
                            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mx-auto text-sm"
                        >
                            <Plus className="size-4" />
                            Create Project
                        </button>
                    </div>
                ) : (
                    filteredProjects.map((project) => (
                        <ProjectCard 
                            key={project.id} 
                            project={project} 
                            stats={getProjectStats(project)} // NEW: Pass folder stats to ProjectCard
                        />
                    ))
                )}
            </div>
        </div>
    );
}