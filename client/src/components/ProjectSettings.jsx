import { format } from "date-fns";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import AddProjectMember from "./AddProjectMember";
import { useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../configs/api";
import { fetchWorkspaces } from "../features/workspaceSlice";
import toast from "react-hot-toast";

export default function ProjectSettings({ project }) {

    const dispatch = useDispatch()
    const { getToken } = useAuth()

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
        progress: 0,
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        toast.loading("Saving project...");
        
        try {
            const token = await getToken();
            const { data } = await api.put(
                `/api/projects/${project.id}`, // 🆕 FIXED: Added project ID to URL
                formData, 
                {
                    headers: { 
                        Authorization: `Bearer ${token}` 
                    }
                }
            );
            
            // Refresh workspaces to get updated project data
            dispatch(fetchWorkspaces({ getToken }));
            
            toast.dismissAll();
            toast.success(data.message || "Project updated successfully!");
        } catch (error) {
            console.error("Update project error:", error);
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message || "Failed to update project");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        toast.loading("Deleting project...");

        try {
            const token = await getToken();
            await api.delete(
                `/api/projects/${project.id}`,
                {
                    headers: { 
                        Authorization: `Bearer ${token}` 
                    }
                }
            );
            
            // Refresh workspaces after deletion
            dispatch(fetchWorkspaces({ getToken }));
            
            toast.dismissAll();
            toast.success("Project deleted successfully!");
            
            // 🆕 You might want to navigate away here
            // navigate('/projects');
            
        } catch (error) {
            console.error("Delete project error:", error);
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message || "Failed to delete project");
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || "",
                description: project.description || "",
                status: project.status || "PLANNING",
                priority: project.priority || "MEDIUM",
                start_date: project.start_date ? format(new Date(project.start_date), "yyyy-MM-dd") : "",
                end_date: project.end_date ? format(new Date(project.end_date), "yyyy-MM-dd") : "",
                progress: project.progress || 0,
            });
        }
    }, [project]);

    const inputClasses = "w-full px-3 py-2 rounded mt-2 border text-sm bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

    const cardClasses = "rounded-lg border p-6 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800";

    const labelClasses = "text-sm text-zinc-600 dark:text-zinc-400 font-medium";

    if (!project) {
        return (
            <div className="flex items-center justify-center p-8">
                <p className="text-zinc-500 dark:text-zinc-400">Project not found</p>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Project Details */}
            <div className="space-y-6">
                <div className={cardClasses}>
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4">Project Details</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className={labelClasses}>Project Name</label>
                            <input 
                                value={formData.name} 
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                className={inputClasses} 
                                required 
                                placeholder="Enter project name"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className={labelClasses}>Description</label>
                            <textarea 
                                value={formData.description} 
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                                className={inputClasses + " h-24"} 
                                placeholder="Project description"
                                rows={4}
                            />
                        </div>

                        {/* Status & Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={labelClasses}>Status</label>
                                <select 
                                    value={formData.status} 
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                                    className={inputClasses}
                                >
                                    <option value="PLANNING">Planning</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className={labelClasses}>Priority</label>
                                <select 
                                    value={formData.priority} 
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })} 
                                    className={inputClasses}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={labelClasses}>Start Date</label>
                                <input 
                                    type="date" 
                                    value={formData.start_date} 
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} 
                                    className={inputClasses} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={labelClasses}>End Date</label>
                                <input 
                                    type="date" 
                                    value={formData.end_date} 
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} 
                                    min={formData.start_date}
                                    className={inputClasses} 
                                />
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                            <label className={labelClasses}>
                                Progress: <span className="text-blue-600 dark:text-blue-400">{formData.progress}%</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                step="5" 
                                value={formData.progress} 
                                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })} 
                                className="w-full accent-blue-500 dark:accent-blue-400" 
                            />
                            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-between items-center pt-4">
                            <button 
                                type="button"
                                onClick={handleDeleteProject}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            >
                                <Trash2 className="size-4" />
                                {isDeleting ? "Deleting..." : "Delete Project"}
                            </button>
                            
                            <button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="flex items-center justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                            >
                                <Save className="size-4" /> 
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Team Members */}
            <div className="space-y-6">
                <div className={cardClasses}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300">
                            Team Members <span className="text-sm text-zinc-600 dark:text-zinc-400">({project.members?.length || 0})</span>
                        </h2>
                        <button 
                            type="button" 
                            onClick={() => setIsDialogOpen(true)} 
                            className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <Plus className="size-4 text-zinc-900 dark:text-zinc-300" />
                        </button>
                    </div>

                    {/* Member List */}
                    {project.members && project.members.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {project.members.map((member) => (
                                <div 
                                    key={member.user?.id || member.id} 
                                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                            {member.user?.name?.charAt(0)?.toUpperCase() || "U"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-300">
                                                {member.user?.name || "Unknown User"}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {member.user?.email || "No email"}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {project.team_lead === member.user?.id && (
                                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-md">
                                            Team Lead
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                            <p className="text-sm">No team members yet</p>
                            <p className="text-xs mt-1">Add team members to collaborate</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Member Dialog */}
            <AddProjectMember 
                isDialogOpen={isDialogOpen} 
                setIsDialogOpen={setIsDialogOpen} 
                projectId={project.id}
            />
        </div>
    );
}