import { useState } from "react";
import { XIcon, FolderIcon } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../configs/api";
import toast from "react-hot-toast";

const CreateFolderDialog = ({ isDialogOpen, setIsDialogOpen, projectId }) => {
    const { getToken } = useAuth();
    const dispatch = useDispatch();
    
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        position: 0,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.name.trim()) {
                return toast.error("Folder name is required");
            }

            setIsSubmitting(true);

            const token = await getToken();
            const { data } = await api.post(
                `/api/projects/${projectId}/folders`, 
                formData, 
                { 
                    headers: { Authorization: `Bearer ${token}` } 
                }
            );

            setIsDialogOpen(false);
            
            // Reset form
            setFormData({
                name: "",
                description: "",
                position: 0,
            });

            toast.success("Folder created successfully!");
            
            // Refresh the page or update state to show the new folder
            window.location.reload(); // Simple solution for now

        } catch (error) {
            console.error("Folder creation error:", error);
            toast.error(error?.response?.data?.message || error.message || "Failed to create folder");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setIsDialogOpen(false);
        setFormData({
            name: "",
            description: "",
            position: 0,
        });
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200 relative">
                <button 
                    className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" 
                    onClick={handleClose}
                >
                    <XIcon className="size-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                        <FolderIcon className="size-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-medium">Create New Folder</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Organize tasks within your project
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Folder Name */}
                    <div>
                        <label className="block text-sm mb-1">Folder Name *</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                            placeholder="Enter folder name" 
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" 
                            required 
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm mb-1">Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                            placeholder="Describe what this folder contains" 
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm h-20" 
                        />
                    </div>

                    {/* Position */}
                    <div>
                        <label className="block text-sm mb-1">Position</label>
                        <input 
                            type="number" 
                            value={formData.position} 
                            onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })} 
                            placeholder="Order position" 
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" 
                            min="0"
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Lower numbers appear first. Leave as 0 for automatic ordering.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-sm">
                        <button 
                            type="button" 
                            onClick={handleClose} 
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800" 
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()} 
                            className="px-4 py-2 rounded bg-gradient-to-br from-green-500 to-green-600 text-white dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                        >
                            {isSubmitting ? "Creating..." : "Create Folder"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFolderDialog;