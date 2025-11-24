import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { Plus, Folder, MoreVertical, FileText, Users, Calendar, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../configs/api";
import { addFolder, updateFolder, deleteFolder } from "../features/workspaceSlice";
import CreateFolderDialog from "./CreateFolderDialog";

export default function ProjectFolders({ folders, projectId }) {
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);

    const handleCreateFolder = async (folderData) => {
        try {
            if (!projectId) {
                toast.error("Project ID is missing");
                return;
            }

            const token = await getToken();
            const { data } = await api.post(
                `/api/projects/${projectId}/folders`,
                folderData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            dispatch(addFolder({ ...data.folder, projectId }));
            toast.success("Folder created successfully!");
            setIsCreateFolderOpen(false);
            
        } catch (error) {
            console.error("Create folder error:", error);
            toast.error(error?.response?.data?.message || "Failed to create folder");
        }
    };

    const handleEditFolder = async (folderId, updates) => {
        try {
            const token = await getToken();
            const { data } = await api.put(
                `/api/projects/${projectId}/folders/${folderId}`,
                updates,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            dispatch(updateFolder({ ...data.folder, projectId }));
            toast.success("Folder updated successfully!");
            setEditingFolder(null);
            
        } catch (error) {
            console.error("Update folder error:", error);
            toast.error(error?.response?.data?.message || "Failed to update folder");
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!confirm("Are you sure you want to delete this folder? Tasks will be moved to project root.")) {
            return;
        }

        try {
            const token = await getToken();
            await api.delete(
                `/api/projects/${projectId}/folders/${folderId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            dispatch(deleteFolder({ projectId, folderId }));
            toast.success("Folder deleted successfully!");
            
        } catch (error) {
            console.error("Delete folder error:", error);
            toast.error(error?.response?.data?.message || "Failed to delete folder");
        }
    };

    if (!projectId) {
        return (
            <div className="text-center py-8 text-zinc-500">
                Project ID is missing
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        Project Folders
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Organize tasks into folders for better management
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateFolderOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Folder
                </button>
            </div>

            {/* Folders Grid */}
            {folders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <Folder className="w-12 h-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                        No folders yet
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm mx-auto">
                        Create your first folder to organize tasks and improve project management.
                    </p>
                    <button
                        onClick={() => setIsCreateFolderOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Folder
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {folders.map((folder) => (
                        <FolderCard 
                            key={folder.id} 
                            folder={folder} 
                            projectId={projectId}
                            onEdit={() => setEditingFolder(folder)}
                            onDelete={() => handleDeleteFolder(folder.id)}
                        />
                    ))}
                </div>
            )}

            {/* Create Folder Dialog */}
            <CreateFolderDialog
                isOpen={isCreateFolderOpen}
                onClose={() => setIsCreateFolderOpen(false)}
                onSubmit={handleCreateFolder}
                projectId={projectId}
            />

            {/* Edit Folder Dialog */}
            {editingFolder && (
                <CreateFolderDialog
                    isOpen={!!editingFolder}
                    onClose={() => setEditingFolder(null)}
                    onSubmit={(data) => handleEditFolder(editingFolder.id, data)}
                    projectId={projectId}
                    initialData={editingFolder}
                    isEditing={true}
                />
            )}
        </div>
    );
}

// Folder Card Component
function FolderCard({ folder, projectId, onEdit, onDelete }) {
    const taskCount = folder.tasks?.length || 0;
    const completedTasks = folder.tasks?.filter(task => task.status === "DONE").length || 0;
    const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

    const handleClick = () => {
        // Navigate to folder tasks view
        window.location.href = `/projectsDetail?id=${projectId}&folderId=${folder.id}&tab=tasks`;
    };

    return (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3" onClick={handleClick}>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-medium text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {folder.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            {folder.description || "No description"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                    >
                        <Edit className="w-3 h-3 text-zinc-400" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                    >
                        <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3" onClick={handleClick}>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Progress
                    </span>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {progress}%
                    </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400" onClick={handleClick}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>{taskCount} tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{completedTasks} done</span>
                    </div>
                </div>
                {folder.updatedAt && (
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                            {new Date(folder.updatedAt).toLocaleDateString()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}