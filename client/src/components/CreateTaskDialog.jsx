import { useState } from "react";
import { Calendar as CalendarIcon, XIcon, Users } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";
import { useAuth } from "@clerk/clerk-react";
import api from "../configs/api";
import toast from "react-hot-toast";
import { addTask } from "../features/workspaceSlice";

export default function CreateTaskDialog({ showCreateTask, setShowCreateTask, projectId }) {

    const { getToken } = useAuth();
    const dispatch = useDispatch();

    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const project = currentWorkspace?.projects.find((p) => p.id === projectId);
    const teamMembers = project?.members || [];

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "GENERAL_TASK", // 🆕 UPDATED: New default
        status: "TODO",
        priority: "MEDIUM",
        assignees: [],
        due_date: "",
    });

    // 🆕 Add assignee to the array
    const addAssignee = (userId) => {
        if (userId && !formData.assignees.includes(userId)) {
            setFormData(prev => ({
                ...prev,
                assignees: [...prev.assignees, userId]
            }));
        }
    };

    // 🆕 Remove assignee from the array
    const removeAssignee = (userId) => {
        setFormData(prev => ({
            ...prev,
            assignees: prev.assignees.filter(id => id !== userId)
        }));
    };

    // 🆕 Get user info for display
    const getUserById = (userId) => {
        return teamMembers.find(member => member.user.id === userId)?.user;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            toast.error("Task title is required");
            return;
        }

        setIsSubmitting(true);
        
        try {
            const token = await getToken();
            const { data } = await api.post(
                '/api/tasks', 
                { 
                    ...formData, 
                    workspaceId: currentWorkspace.id, 
                    projectId 
                }, 
                { 
                    headers: { Authorization: `Bearer ${token}` } 
                }
            );
            
            setShowCreateTask(false);
            setFormData({
                title: "",
                description: "",
                type: "GENERAL_TASK", // 🆕 UPDATED: Reset to new default
                status: "TODO",
                priority: "MEDIUM",
                assignees: [],
                due_date: "",
            });
            
            toast.success(data.message || "Task created successfully!");
            dispatch(addTask(data.task));
            
        } catch (error) {
            console.error("Create task error:", error);
            toast.error(error?.response?.data?.message || error.message || "Failed to create task");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setShowCreateTask(false);
        setFormData({
            title: "",
            description: "",
            type: "GENERAL_TASK", // 🆕 UPDATED: Reset to new default
            status: "TODO",
            priority: "MEDIUM",
            assignees: [],
            due_date: "",
        });
    };

    // 🆕 Filter out already selected members
    const availableMembers = teamMembers.filter(
        member => !formData.assignees.includes(member.user.id)
    );

    return showCreateTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 text-zinc-900 dark:text-white max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Create New Task</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1">
                        <label htmlFor="title" className="text-sm font-medium">Title *</label>
                        <input 
                            value={formData.title} 
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                            placeholder="Task title" 
                            className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            required 
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label htmlFor="description" className="text-sm font-medium">Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                            placeholder="Describe the task" 
                            className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                    </div>

                    {/* Type & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Type</label>
                            <select 
                                value={formData.type} 
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            >
                                {/* 🆕 UPDATED: New task types */}
                                <option value="GENERAL_TASK">General Task</option>
                                <option value="WEEKLY_EMAILS">Weekly Emails</option>
                                <option value="CALENDARS">Calendars</option>
                                <option value="CLIENT">Client</option>
                                <option value="SOCIAL">Social</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Priority</label>
                            <select 
                                value={formData.priority} 
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })} 
                                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* 🆕 Multiple Assignees */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Users className="size-4" /> Assignees
                        </label>
                        
                        {/* Assignee Selection */}
                        {availableMembers.length > 0 && (
                            <select 
                                onChange={(e) => addAssignee(e.target.value)}
                                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                defaultValue=""
                            >
                                <option value="">Add team member...</option>
                                {availableMembers.map((member) => (
                                    <option key={member.user.id} value={member.user.id}>
                                        {member.user.name} ({member.user.email})
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Selected Assignees Display */}
                        {formData.assignees.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.assignees.map((userId) => {
                                    const user = getUserById(userId);
                                    return (
                                        <div 
                                            key={userId} 
                                            className="flex items-center gap-2 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-sm"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                                {user?.name?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                            <span className="text-xs">{user?.name || "Unknown"}</span>
                                            <button 
                                                type="button"
                                                onClick={() => removeAssignee(userId)}
                                                className="hover:bg-blue-200 dark:hover:bg-blue-500/30 rounded-full p-0.5"
                                            >
                                                <XIcon className="size-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {availableMembers.length === 0 && formData.assignees.length > 0 && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                All team members are assigned to this task
                            </p>
                        )}
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Status</label>
                        <select 
                            value={formData.status} 
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                            className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        >
                            {/* 🆕 UPDATED: New status options */}
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="INTERNAL_REVIEW">Internal Review</option>
                            <option value="DONE">Done</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Due Date</label>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="size-5 text-zinc-500 dark:text-zinc-400" />
                            <input 
                                type="date" 
                                value={formData.due_date} 
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} 
                                min={new Date().toISOString().split('T')[0]} 
                                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            />
                        </div>
                        {formData.due_date && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {format(new Date(formData.due_date), "PPP")}
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-4">
                        <button 
                            type="button" 
                            onClick={handleClose} 
                            className="rounded border border-zinc-300 dark:border-zinc-700 px-5 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !formData.title.trim()} 
                            className="rounded px-5 py-2 text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white dark:text-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed" 
                        >
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;
}