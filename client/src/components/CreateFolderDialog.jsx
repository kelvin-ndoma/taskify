import { useState, useEffect } from "react";
import { X } from "lucide-react";

const CreateFolderDialog = ({ isOpen, onClose, onSubmit, projectId, initialData, isEditing = false }) => {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        position: 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when dialog opens/closes or when initialData changes
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name || "",
                    description: initialData.description || "",
                    position: initialData.position || 0
                });
            } else {
                setFormData({
                    name: "",
                    description: "",
                    position: 0
                });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            alert("Folder name is required");
            return;
        }

        if (!projectId) {
            alert("Project ID is missing");
            return;
        }

        setIsSubmitting(true);
        
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error("Form submission error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: "",
            description: "",
            position: 0
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-zinc-900 rounded-lg w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {isEditing ? "Edit Folder" : "Create New Folder"}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Folder Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter folder name"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe what this folder contains"
                            rows={3}
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Position
                        </label>
                        <input
                            type="number"
                            value={formData.position}
                            onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))}
                            placeholder="Position in list"
                            min="0"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Lower numbers appear first
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                            {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Folder" : "Create Folder")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFolderDialog;