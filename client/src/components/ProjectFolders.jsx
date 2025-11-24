// src/components/ProjectFolders.jsx
import { useState } from "react";
import { PlusIcon, FolderIcon, MoreVerticalIcon, EditIcon, TrashIcon, FileTextIcon } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../configs/api";
import toast from "react-hot-toast";
import { addFolder, updateFolder, deleteFolder } from "../features/workspaceSlice";

const ProjectFolders = ({ folders = [], projectId }) => {
    const { getToken } = useAuth();
    const dispatch = useDispatch();
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [showMenu, setShowMenu] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: ""
    });

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Folder name is required");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await getToken();
            const { data } = await api.post(
                `/api/projects/${projectId}/folders`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            dispatch(addFolder(data.folder));
            setShowCreateFolder(false);
            setFormData({ name: "", description: "" });
            toast.success("Folder created successfully!");
        } catch (error) {
            console.error("Create folder error:", error);
            toast.error(error?.response?.data?.message || "Failed to create folder");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateFolder = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Folder name is required");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await getToken();
            const { data } = await api.put(
                `/api/projects/${projectId}/folders/${editingFolder.id}`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            dispatch(updateFolder(data.folder));
            setEditingFolder(null);
            setFormData({ name: "", description: "" });
            setShowMenu(null);
            toast.success("Folder updated successfully!");
        } catch (error) {
            console.error("Update folder error:", error);
            toast.error(error?.response?.data?.message || "Failed to update folder");
        } finally {
            setIsSubmitting(false);
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
            setShowMenu(null);
            toast.success("Folder deleted successfully!");
        } catch (error) {
            console.error("Delete folder error:", error);
            toast.error(error?.response?.data?.message || "Failed to delete folder");
        }
    };

    const startEdit = (folder) => {
        setEditingFolder(folder);
        setFormData({
            name: folder.name,
            description: folder.description || ""
        });
        setShowMenu(null);
    };

    const cancelEdit = () => {
        setEditingFolder(null);
        setFormData({ name: "", description: "" });
    };

    const FolderCard = ({ folder }) => {
        const taskCount = folder.tasks?.length || 0;
        const isEditing = editingFolder?.id === folder.id;

        if (isEditing) {
            return (
                <div className="bg-white dark:bg-zinc-800 border border-blue-300 dark:border-blue-600 rounded-lg p-4">
                    <form onSubmit={handleUpdateFolder} className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Folder Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-zinc-600 dark:bg-zinc-700 text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-zinc-600 dark:bg-zinc-700 text-sm h-20"
                                placeholder="Optional folder description"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                            >
                                {isSubmitting ? "Saving..." : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            );
        }

        return (
            <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-zinc-600 transition-colors group">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <FolderIcon className="size-6 text-blue-500 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                {folder.name}
                            </h3>
                            {folder.description && (
                                <p className="text-sm text-gray-600 dark:text-zinc-300 mb-2">
                                    {folder.description}
                                </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <FileTextIcon className="size-3" />
                                    {taskCount} task{taskCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(showMenu === folder.id ? null : folder.id)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreVerticalIcon className="size-4" />
                        </button>
                        
                        {showMenu === folder.id && (
                            <div className="absolute right-0 top-8 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 min-w-32">
                                <button
                                    onClick={() => startEdit(folder)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-t-lg"
                                >
                                    <EditIcon className="size-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteFolder(folder.id)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                                >
                                    <TrashIcon className="size-4" />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const CreateFolderForm = () => (
        <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Folder Name *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter folder name"
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-zinc-600 dark:bg-zinc-700 text-sm"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional folder description"
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-zinc-600 dark:bg-zinc-700 text-sm h-20"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                    >
                        {isSubmitting ? "Creating..." : "Create Folder"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCreateFolder(false)}
                        className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Folders</h2>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                        Organize tasks into folders for better management
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateFolder(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    <PlusIcon className="size-4" />
                    New Folder
                </button>
            </div>

            {/* Create Folder Form */}
            {showCreateFolder && <CreateFolderForm />}

            {/* Folders Grid */}
            {folders.length === 0 && !showCreateFolder ? (
                <div className="text-center py-12">
                    <FolderIcon className="size-16 text-gray-400 dark:text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No folders yet
                    </h3>
                    <p className="text-gray-600 dark:text-zinc-400 mb-4 max-w-md mx-auto">
                        Create folders to organize your tasks. You can group tasks by category, 
                        department, or any other system that works for your team.
                    </p>
                    <button
                        onClick={() => setShowCreateFolder(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        <PlusIcon className="size-4" />
                        Create Your First Folder
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folders.map((folder) => (
                        <FolderCard key={folder.id} folder={folder} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProjectFolders;