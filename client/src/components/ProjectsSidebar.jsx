import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { 
    ChevronRightIcon, 
    SettingsIcon, 
    KanbanIcon, 
    ChartColumnIcon, 
    CalendarIcon, 
    ArrowRightIcon,
    FolderIcon,
    FileTextIcon 
} from 'lucide-react';
import { useSelector } from 'react-redux';

const ProjectSidebar = () => {

    const location = useLocation();
    const [searchParams] = useSearchParams();

    const projects = useSelector(
        (state) => state?.workspace?.currentWorkspace?.projects || []
    );

    // State for expanded projects and folders
    const [expandedProjects, setExpandedProjects] = useState(new Set());
    const [expandedFolders, setExpandedFolders] = useState(new Set());

    const getProjectSubItems = (projectId) => [
        { title: 'Tasks', icon: KanbanIcon, url: `/projectsDetail?id=${projectId}&tab=tasks` },
        { title: 'Folders', icon: FolderIcon, url: `/projectsDetail?id=${projectId}&tab=folders` },
        { title: 'Analytics', icon: ChartColumnIcon, url: `/projectsDetail?id=${projectId}&tab=analytics` },
        { title: 'Calendar', icon: CalendarIcon, url: `/projectsDetail?id=${projectId}&tab=calendar` },
        { title: 'Settings', icon: SettingsIcon, url: `/projectsDetail?id=${projectId}&tab=settings` }
    ];

    const getFolderSubItems = (projectId, folderId) => [
        { title: 'Tasks', icon: FileTextIcon, url: `/projectsDetail?id=${projectId}&folderId=${folderId}&tab=tasks` },
        { title: 'View Folder', icon: FolderIcon, url: `/projectsDetail?id=${projectId}&folderId=${folderId}&tab=folders` }
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

    // Get folders for a specific project
    const getProjectFolders = (projectId) => {
        const project = projects.find(p => p.id === projectId);
        return project?.folders || [];
    };

    // Check if a folder is active
    const isFolderActive = (projectId, folderId) => {
        return (
            location.pathname === '/projectsDetail' &&
            searchParams.get('id') === projectId &&
            searchParams.get('folderId') === folderId
        );
    };

    // Check if a project sub-item is active
    const isProjectSubItemActive = (projectId, subItem) => {
        return (
            location.pathname === '/projectsDetail' &&
            searchParams.get('id') === projectId &&
            searchParams.get('tab') === subItem.title.toLowerCase() &&
            !searchParams.get('folderId') // Only active when no folder is selected
        );
    };

    // Check if a folder sub-item is active
    const isFolderSubItemActive = (projectId, folderId, subItem) => {
        return (
            location.pathname === '/projectsDetail' &&
            searchParams.get('id') === projectId &&
            searchParams.get('folderId') === folderId &&
            searchParams.get('tab') === subItem.title.toLowerCase()
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
                    const projectFolders = getProjectFolders(project.id);
                    const isProjectExpanded = expandedProjects.has(project.id);
                    
                    return (
                        <div key={project.id}>
                            {/* Project Header */}
                            <button 
                                onClick={() => toggleProject(project.id)} 
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white" 
                            >
                                <ChevronRightIcon 
                                    className={`size-3 text-gray-500 dark:text-zinc-400 transition-transform duration-200 ${
                                        isProjectExpanded && 'rotate-90'
                                    }`} 
                                />
                                <div className="size-2 rounded-full bg-blue-500" />
                                <span className="truncate max-w-40 text-sm">{project.name}</span>
                                {projectFolders.length > 0 && (
                                    <span className="ml-auto text-xs text-gray-400 dark:text-zinc-500">
                                        {projectFolders.length}
                                    </span>
                                )}
                            </button>

                            {/* Project Sub-items */}
                            {isProjectExpanded && (
                                <div className="ml-5 mt-1 space-y-1">
                                    {/* Project-level navigation */}
                                    {getProjectSubItems(project.id).map((subItem) => {
                                        const isActive = isProjectSubItemActive(project.id, subItem);
                                        
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

                                    {/* Folders Section */}
                                    {projectFolders.length > 0 && (
                                        <div className="pt-2 border-t border-gray-200 dark:border-zinc-700">
                                            <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                                Folders
                                            </div>
                                            <div className="space-y-1 mt-1">
                                                {projectFolders.map((folder) => {
                                                    const isFolderExpanded = expandedFolders.has(folder.id);
                                                    const isActiveFolder = isFolderActive(project.id, folder.id);
                                                    
                                                    return (
                                                        <div key={folder.id}>
                                                            {/* Folder Header */}
                                                            <button 
                                                                onClick={() => toggleFolder(folder.id)} 
                                                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200 text-xs ${
                                                                    isActiveFolder
                                                                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20'
                                                                        : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
                                                                }`}
                                                            >
                                                                <ChevronRightIcon 
                                                                    className={`size-3 transition-transform duration-200 ${
                                                                        isFolderExpanded && 'rotate-90'
                                                                    }`} 
                                                                />
                                                                <FolderIcon className="size-3" />
                                                                <span className="truncate flex-1 text-left">
                                                                    {folder.name}
                                                                </span>
                                                                <span className="text-xs opacity-60">
                                                                    {folder.tasks?.length || 0}
                                                                </span>
                                                            </button>

                                                            {/* Folder Sub-items */}
                                                            {isFolderExpanded && (
                                                                <div className="ml-6 mt-1 space-y-1">
                                                                    {getFolderSubItems(project.id, folder.id).map((subItem) => {
                                                                        const isActive = isFolderSubItemActive(project.id, folder.id, subItem);
                                                                        
                                                                        return (
                                                                            <Link 
                                                                                key={subItem.title} 
                                                                                to={subItem.url} 
                                                                                className={`flex items-center gap-3 px-3 py-1 rounded-lg transition-colors duration-200 text-xs ${
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
                                    )}
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