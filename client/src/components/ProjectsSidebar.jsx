import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRightIcon, SettingsIcon, KanbanIcon, ChartColumnIcon, CalendarIcon, ArrowRightIcon, FolderIcon, FolderOpenIcon } from 'lucide-react';
import { useSelector } from 'react-redux';

const ProjectSidebar = () => {

    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [expandedProjects, setExpandedProjects] = useState(new Set());
    const [expandedFolders, setExpandedFolders] = useState(new Set());

    const projects = useSelector(
        (state) => state?.workspace?.currentWorkspace?.projects || []
    );

    const getProjectSubItems = (projectId) => [
        { title: 'Tasks', icon: KanbanIcon, url: `/projectsDetail?id=${projectId}&tab=tasks` },
        { title: 'Analytics', icon: ChartColumnIcon, url: `/projectsDetail?id=${projectId}&tab=analytics` },
        { title: 'Calendar', icon: CalendarIcon, url: `/projectsDetail?id=${projectId}&tab=calendar` },
        { title: 'Settings', icon: SettingsIcon, url: `/projectsDetail?id=${projectId}&tab=settings` }
    ];

    const toggleProject = (id) => {
        const newSet = new Set(expandedProjects);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setExpandedProjects(newSet);
    };

    const toggleFolder = (folderId) => {
        const newSet = new Set(expandedFolders);
        newSet.has(folderId) ? newSet.delete(folderId) : newSet.add(folderId);
        setExpandedFolders(newSet);
    };

    // Check if a folder is currently active
    const isFolderActive = (projectId, folderId) => {
        return (
            location.pathname === '/projectsDetail' &&
            searchParams.get('id') === projectId &&
            searchParams.get('folderId') === folderId
        );
    };

    // Check if project tasks (no folder) is active
    const isProjectTasksActive = (projectId) => {
        return (
            location.pathname === '/projectsDetail' &&
            searchParams.get('id') === projectId &&
            searchParams.get('tab') === 'tasks' &&
            !searchParams.get('folderId')
        );
    };

    return (
        <div className="mt-6 px-3">
            <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    Projects
                </h3>
                <Link to="/projects">
                    <button className="size-5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded flex items-center justify-center transition-colors duration-200">
                        <ArrowRightIcon className="size-3" />
                    </button>
                </Link>
            </div>

            <div className="space-y-1 px-3">
                {projects.map((project) => {
                    const projectFolders = project.folders || [];
                    const hasFolders = projectFolders.length > 0;

                    return (
                        <div key={project.id}>
                            {/* Project Header */}
                            <button 
                                onClick={() => toggleProject(project.id)} 
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white" 
                            >
                                <ChevronRightIcon 
                                    className={`size-3 text-gray-500 dark:text-zinc-400 transition-transform duration-200 ${
                                        expandedProjects.has(project.id) && 'rotate-90'
                                    }`} 
                                />
                                <div className="size-2 rounded-full bg-blue-500" />
                                <span className="truncate max-w-40 text-sm">{project.name}</span>
                                {hasFolders && (
                                    <span className="ml-auto text-xs text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                        {projectFolders.length}
                                    </span>
                                )}
                            </button>

                            {expandedProjects.has(project.id) && (
                                <div className="ml-5 mt-1 space-y-1">
                                    {/* Project Tasks (No Folder) */}
                                    <Link 
                                        to={`/projectsDetail?id=${project.id}&tab=tasks`}
                                        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors duration-200 text-xs ${
                                            isProjectTasksActive(project.id)
                                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20'
                                                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <KanbanIcon className="size-3" />
                                        All Tasks
                                        <span className="ml-auto text-xs text-gray-400 dark:text-zinc-500">
                                            {project.tasks?.length || 0}
                                        </span>
                                    </Link>

                                    {/* Folders Section */}
                                    {hasFolders && (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                                <FolderOpenIcon className="size-3" />
                                                Folders
                                            </div>
                                            
                                            {projectFolders.map((folder) => (
                                                <div key={folder.id} className="space-y-1">
                                                    {/* Folder Header */}
                                                    <button
                                                        onClick={() => toggleFolder(folder.id)}
                                                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200 text-xs ${
                                                            isFolderActive(project.id, folder.id)
                                                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20'
                                                                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
                                                        }`}
                                                    >
                                                        <ChevronRightIcon 
                                                            className={`size-3 transition-transform duration-200 ${
                                                                expandedFolders.has(folder.id) && 'rotate-90'
                                                            }`} 
                                                        />
                                                        <FolderIcon className="size-3" />
                                                        <span className="truncate flex-1 text-left">
                                                            {folder.name}
                                                        </span>
                                                        <span className="text-xs text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                            {folder.tasks?.length || 0}
                                                        </span>
                                                    </button>

                                                    {/* Folder Tasks */}
                                                    {expandedFolders.has(folder.id) && folder.tasks && folder.tasks.length > 0 && (
                                                        <div className="ml-6 space-y-0.5">
                                                            {folder.tasks.slice(0, 5).map((task) => (
                                                                <Link
                                                                    key={task.id}
                                                                    to={`/projectsDetail?id=${project.id}&tab=tasks&folderId=${folder.id}&taskId=${task.id}`}
                                                                    className="flex items-center gap-2 px-3 py-1 rounded text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors truncate"
                                                                >
                                                                    <div className={`size-1.5 rounded-full ${
                                                                        task.status === 'DONE' ? 'bg-green-500' :
                                                                        task.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                                                                        task.status === 'TODO' ? 'bg-gray-400' :
                                                                        'bg-yellow-500'
                                                                    }`} />
                                                                    {task.title}
                                                                </Link>
                                                            ))}
                                                            {folder.tasks.length > 5 && (
                                                                <div className="px-3 py-1 text-xs text-gray-400 dark:text-zinc-500">
                                                                    +{folder.tasks.length - 5} more tasks
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Project Sections */}
                                    {getProjectSubItems(project.id)
                                        .filter(item => item.title !== 'Tasks') // Remove Tasks since we have custom implementation
                                        .map((subItem) => {
                                            const isActive =
                                                location.pathname === '/projectsDetail' &&
                                                searchParams.get('id') === project.id &&
                                                searchParams.get('tab') === subItem.title.toLowerCase();

                                            return (
                                                <Link 
                                                    key={subItem.title} 
                                                    to={subItem.url} 
                                                    className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors duration-200 text-xs ${
                                                        isActive 
                                                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20'
                                                            : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
                                                    }`}
                                                >
                                                    <subItem.icon className="size-3" />
                                                    {subItem.title}
                                                </Link>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectSidebar;