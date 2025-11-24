import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderOpenIcon } from 'lucide-react'
import { useSelector } from 'react-redux'

const ProjectSidebar = () => {
    const { currentWorkspace } = useSelector(state => state.workspace)
    const location = useLocation()
    const [expandedProjects, setExpandedProjects] = useState(new Set())

    const toggleProject = (projectId) => {
        setExpandedProjects(prev => {
            const newSet = new Set(prev)
            if (newSet.has(projectId)) {
                newSet.delete(projectId)
            } else {
                newSet.add(projectId)
            }
            return newSet
        })
    }

    // Group projects by status for better organization
    const activeProjects = currentWorkspace?.projects?.filter(p => 
        p.status === 'ACTIVE' || p.status === 'PLANNING'
    ) || []

    const completedProjects = currentWorkspace?.projects?.filter(p => 
        p.status === 'COMPLETED'
    ) || []

    const otherProjects = currentWorkspace?.projects?.filter(p => 
        !['ACTIVE', 'PLANNING', 'COMPLETED'].includes(p.status)
    ) || []

    const ProjectItem = ({ project }) => {
        const isExpanded = expandedProjects.has(project.id)
        const hasFolders = project.folders && project.folders.length > 0
        const totalTasks = (project.tasks?.length || 0) + 
                          (project.folders?.reduce((total, folder) => total + (folder.tasks?.length || 0), 0) || 0)

        return (
            <div className="mb-1">
                {/* Project Header */}
                <div className="flex items-center justify-between group">
                    <button
                        onClick={() => toggleProject(project.id)}
                        className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm w-full text-left transition-colors ${
                            location.pathname === '/projectsDetail' && 
                            new URLSearchParams(location.search).get('id') === project.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {hasFolders ? (
                                isExpanded ? (
                                    <ChevronDownIcon className="size-3.5 flex-shrink-0" />
                                ) : (
                                    <ChevronRightIcon className="size-3.5 flex-shrink-0" />
                                )
                            ) : (
                                <div className="size-3.5 flex-shrink-0" /> // Spacer for alignment
                            )}
                            <FolderOpenIcon className="size-4 flex-shrink-0" />
                            <span className="truncate flex-1">{project.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-zinc-400 flex-shrink-0 ml-2">
                            {totalTasks}
                        </span>
                    </button>
                </div>

                {/* Folders List */}
                {isExpanded && hasFolders && (
                    <div className="ml-7 mt-1 space-y-1">
                        {project.folders.map((folder) => {
                            const folderTasksCount = folder.tasks?.length || 0
                            const isFolderActive = location.pathname === '/projectsDetail' && 
                                                  new URLSearchParams(location.search).get('id') === project.id &&
                                                  new URLSearchParams(location.search).get('folder') === folder.id

                            return (
                                <Link
                                    key={folder.id}
                                    to={`/projectsDetail?id=${project.id}&tab=tasks&folder=${folder.id}`}
                                    className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm transition-colors ${
                                        isFolderActive
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    <FolderIcon className="size-3.5 flex-shrink-0" />
                                    <span className="truncate flex-1">{folder.name}</span>
                                    {folderTasksCount > 0 && (
                                        <span className="text-xs text-gray-500 dark:text-zinc-400 flex-shrink-0">
                                            {folderTasksCount}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    const ProjectSection = ({ title, projects, showIfEmpty = true }) => {
        if (!showIfEmpty && projects.length === 0) return null

        return (
            <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2 px-2">
                    {title} ({projects.length})
                </h3>
                <div className="space-y-1">
                    {projects.map(project => (
                        <ProjectItem key={project.id} project={project} />
                    ))}
                </div>
            </div>
        )
    }

    if (!currentWorkspace?.projects?.length) {
        return (
            <div className="px-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <FolderOpenIcon size={16} />
                    Projects
                </h3>
                <div className="text-center py-6">
                    <FolderOpenIcon className="size-8 text-gray-400 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-zinc-400">No projects yet</p>
                    <Link 
                        to="/projects"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                    >
                        Create your first project
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="px-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FolderOpenIcon size={16} />
                Projects
            </h3>

            {/* Active Projects */}
            <ProjectSection 
                title="Active" 
                projects={activeProjects}
                showIfEmpty={false}
            />

            {/* Completed Projects */}
            <ProjectSection 
                title="Completed" 
                projects={completedProjects}
                showIfEmpty={false}
            />

            {/* Other Projects */}
            {otherProjects.length > 0 && (
                <ProjectSection 
                    title="Other" 
                    projects={otherProjects}
                />
            )}

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
                <Link 
                    to="/projects"
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                    <FolderOpenIcon size={16} />
                    View all projects
                </Link>
            </div>
        </div>
    )
}

export default ProjectSidebar