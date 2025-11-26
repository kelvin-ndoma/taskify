import { format } from "date-fns";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { deleteTask, updateTask } from "../features/workspaceSlice";
import { CalendarIcon, Trash, XIcon, Users, Mail, User, Heart, Circle, Square, FolderIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../configs/api";

// 🆕 UPDATED: Type icons with new values
const typeIcons = {
    GENERAL_TASK: { icon: Square, color: "text-green-600 dark:text-green-400" },
    WEEKLY_EMAILS: { icon: Mail, color: "text-blue-600 dark:text-blue-400" },
    CALENDARS: { icon: CalendarIcon, color: "text-purple-600 dark:text-purple-400" },
    CLIENT: { icon: User, color: "text-amber-600 dark:text-amber-400" },
    SOCIAL: { icon: Heart, color: "text-pink-600 dark:text-pink-400" },
    OTHER: { icon: Circle, color: "text-gray-600 dark:text-gray-400" },
};

const priorityTexts = {
    LOW: { background: "bg-red-100 dark:bg-red-950", prioritycolor: "text-red-600 dark:text-red-400" },
    MEDIUM: { background: "bg-blue-100 dark:bg-blue-950", prioritycolor: "text-blue-600 dark:text-blue-400" },
    HIGH: { background: "bg-emerald-100 dark:bg-emerald-950", prioritycolor: "text-emerald-600 dark:text-emerald-400" },
};

// 🆕 Safe image URL handler
const getSafeImageUrl = (imageUrl) => {
    if (!imageUrl || imageUrl.trim() === "" || imageUrl === "null") {
        return null;
    }
    return imageUrl;
};

// 🆕 FIXED: User avatar component with proper static class names
const UserAvatar = ({ user, size = "sm" }) => {
    const sizeClasses = {
        sm: "w-5 h-5 text-xs",
        md: "w-6 h-6 text-sm", 
        lg: "w-8 h-8 text-base"
    };

    const safeImage = getSafeImageUrl(user?.image);
    
    if (safeImage) {
        return (
            <img
                src={safeImage}
                alt={user?.name || "User"}
                className={`${sizeClasses[size]} rounded-full bg-gray-200 dark:bg-zinc-800 object-cover`}
            />
        );
    }
    
    const initials = user?.name?.charAt(0)?.toUpperCase() || "U";
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-medium`}>
            {initials}
        </div>
    );
};

const ProjectTasks = ({ tasks, folders, projectId }) => {
    const { getToken } = useAuth();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [selectedTasks, setSelectedTasks] = useState([]);

    // 🆕 NEW: Get folderId from URL if viewing folder tasks
    const folderId = searchParams.get('folderId');
    const currentFolder = folderId ? folders?.find(f => f.id === folderId) : null;

    const [filters, setFilters] = useState({
        status: "",
        type: "",
        priority: "",
        assignee: "",
    });

    // 🆕 DEBUG: Log tasks data to see structure
    useEffect(() => {
        console.log('🔍 DEBUG - ProjectTasks Data Analysis:');
        console.log('Total tasks received:', tasks?.length || 0);
        console.log('Tasks structure:', tasks);
        
        if (tasks && tasks.length > 0) {
            tasks.forEach((task, index) => {
                console.log(`Task ${index + 1}:`, {
                    id: task.id,
                    title: task.title,
                    assignees: task.assignees,
                    assigneesCount: task.assignees?.length || 0,
                    hasAssignees: !!task.assignees && task.assignees.length > 0,
                    assigneesStructure: task.assignees?.[0] // Show first assignee structure
                });
            });

            // Check if there are tasks with assignees but they're not showing
            const tasksWithAssignees = tasks.filter(task => 
                task.assignees && task.assignees.length > 0
            );
            console.log('Tasks with assignees:', tasksWithAssignees.length);
            console.log('Tasks without assignees:', tasks.length - tasksWithAssignees.length);
        }
    }, [tasks]);

    // 🆕 UPDATED: Get tasks based on whether we're viewing folder or project tasks
    const getTasksToDisplay = () => {
        if (folderId && currentFolder) {
            // Show tasks from specific folder
            return currentFolder.tasks || [];
        } else {
            // Show tasks from project root (no folder)
            return tasks?.filter(task => !task.folderId) || [];
        }
    };

    const tasksToDisplay = getTasksToDisplay();

    // 🆕 FIXED: Get unique assignee names from multiple assignees
    const assigneeList = useMemo(() => {
        const allAssignees = tasksToDisplay.flatMap(task => 
            task.assignees?.map(assignee => ({
                label: assignee.user?.name || "Unknown User",
                value: assignee.user?.name || "Unknown User"
            })) || []
        );
        
        // Remove duplicates and filter out undefined
        const uniqueAssignees = Array.from(new Map(
            allAssignees.filter(a => a.value && a.value !== "Unknown User").map(item => [item.value, item])
        ).values());
        
        console.log('👥 Assignee list generated:', uniqueAssignees);
        return uniqueAssignees;
    }, [tasksToDisplay]);

    const filteredTasks = useMemo(() => {
        return tasksToDisplay.filter((task) => {
            const { status, type, priority, assignee } = filters;
            
            // 🆕 FIX: Check if any assignee matches the filter
            const hasMatchingAssignee = !assignee || 
                task.assignees?.some(assigneeObj => assigneeObj.user?.name === assignee);
            
            return (
                (!status || task.status === status) &&
                (!type || task.type === type) &&
                (!priority || task.priority === priority) &&
                hasMatchingAssignee
            );
        });
    }, [filters, tasksToDisplay]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            toast.loading("Updating status...");

            const token = getToken();

            // Update task status
            await api.put(`/api/tasks/${taskId}`, { status: newStatus }, { 
                headers: { Authorization: `Bearer ${token}` } 
            });

            let updatedTask = structuredClone(tasksToDisplay.find((t) => t.id === taskId));
            updatedTask.status = newStatus;
            dispatch(updateTask(updatedTask));

            toast.dismissAll();
            toast.success("Task status updated successfully");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
        }
    };

    const handleDelete = async () => {
        try {
            const confirm = window.confirm("Are you sure you want to delete the selected tasks?");
            if (!confirm) return;

            const token = getToken();

            toast.loading("Deleting tasks...");

            await api.delete("/api/tasks", { 
                data: { tasksIds: selectedTasks },
                headers: { Authorization: `Bearer ${token}` } 
            });

            dispatch(deleteTask(selectedTasks));
            setSelectedTasks([]);

            toast.dismissAll();
            toast.success("Tasks deleted successfully");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
        }
    };

    // 🆕 NEW: Folder header for folder tasks
    const renderFolderHeader = () => {
        if (!folderId || !currentFolder) return null;

        return (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                    <FolderIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <div>
                        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            {currentFolder.name}
                        </h2>
                        <p className="text-blue-700 dark:text-blue-300 text-sm">
                            {currentFolder.description || "Folder tasks"}
                        </p>
                        <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} in this folder
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // 🆕 FIXED: Robust assignee rendering that handles different data structures
    const renderAssignees = (task) => {
        console.log('🔄 Rendering assignees for task:', task.id, 'assignees:', task.assignees);
        
        // Handle different data structures
        let assignees = task.assignees;
        
        // If no assignees or empty array
        if (!assignees || assignees.length === 0) {
            console.log('❌ No assignees found for task:', task.id);
            return (
                <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Unassigned</span>
                </div>
            );
        }

        console.log('✅ Assignees to render:', assignees);

        // Show first assignee and count for desktop
        if (assignees.length === 1) {
            const assignee = assignees[0];
            const user = assignee.user; // Your API returns { user: { ... } } structure
            
            return (
                <div className="flex items-center gap-2">
                    <UserAvatar user={user} size="sm" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {user?.name || "Unknown User"}
                    </span>
                </div>
            );
        }

        // Show multiple assignees with count
        return (
            <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                    {assignees.slice(0, 3).map((assignee, index) => {
                        const user = assignee.user; // Your API returns { user: { ... } } structure
                        return (
                            <div key={user?.id || index} className="relative">
                                <UserAvatar user={user} size="sm" />
                            </div>
                        );
                    })}
                    {assignees.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-zinc-800">
                            +{assignees.length - 3}
                        </div>
                    )}
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {assignees.length} people
                </span>
            </div>
        );
    };

    // 🆕 FIXED: Robust mobile assignees view
    const renderMobileAssignees = (task) => {
        let assignees = task.assignees;
        
        if (!assignees || assignees.length === 0) {
            return (
                <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Unassigned</span>
                </div>
            );
        }

        if (assignees.length === 1) {
            const assignee = assignees[0];
            const user = assignee.user;
            return (
                <div className="flex items-center gap-2">
                    <UserAvatar user={user} size="sm" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {user?.name || "Unknown User"}
                    </span>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                    {assignees.slice(0, 2).map((assignee, index) => {
                        const user = assignee.user;
                        return (
                            <div key={user?.id || index} className="relative">
                                <UserAvatar user={user} size="sm" />
                            </div>
                        );
                    })}
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {assignees.length} people
                </span>
            </div>
        );
    };

    // 🆕 FIXED: Custom select classes for proper dark mode visibility
    const selectClasses = "border bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 outline-none px-3 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 appearance-none cursor-pointer";
    
    // 🆕 FIXED: Status select classes
    const statusSelectClasses = "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 outline-none px-2 pr-8 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 cursor-pointer appearance-none";

    return (
        <div>
            {/* 🆕 NEW: Folder Header */}
            {renderFolderHeader()}

            {/* 🆕 DEBUG: Temporary data display - remove after testing */}
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded text-sm">
                <strong>Debug Info:</strong> Showing {filteredTasks.length} tasks. 
                Tasks with assignees: {filteredTasks.filter(t => t.assignees && t.assignees.length > 0).length}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
                {["status", "type", "priority", "assignee"].map((name) => {
                    const options = {
                        status: [
                            { label: "All Statuses", value: "" },
                            { label: "To Do", value: "TODO" },
                            { label: "In Progress", value: "IN_PROGRESS" },
                            { label: "Internal Review", value: "INTERNAL_REVIEW" },
                            { label: "Done", value: "DONE" },
                            { label: "Cancelled", value: "CANCELLED" },
                        ],
                        type: [
                            { label: "All Types", value: "" },
                            { label: "General Task", value: "GENERAL_TASK" },
                            { label: "Weekly Emails", value: "WEEKLY_EMAILS" },
                            { label: "Calendars", value: "CALENDARS" },
                            { label: "Client", value: "CLIENT" },
                            { label: "Social", value: "SOCIAL" },
                            { label: "Other", value: "OTHER" },
                        ],
                        priority: [
                            { label: "All Priorities", value: "" },
                            { label: "Low", value: "LOW" },
                            { label: "Medium", value: "MEDIUM" },
                            { label: "High", value: "HIGH" },
                        ],
                        assignee: [
                            { label: "All Assignees", value: "" },
                            ...assigneeList,
                        ],
                    };
                    return (
                        <div key={name} className="relative">
                            <select 
                                name={name} 
                                onChange={handleFilterChange}
                                className={selectClasses}
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '1.5em 1.5em',
                                    paddingRight: '2.5rem'
                                }}
                            >
                                {options[name].map((opt, idx) => (
                                    <option key={idx} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}

                {/* Reset filters */}
                {(filters.status || filters.type || filters.priority || filters.assignee) && (
                    <button 
                        type="button" 
                        onClick={() => setFilters({ status: "", type: "", priority: "", assignee: "" })} 
                        className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-purple-400 to-purple-500 text-white text-sm transition-colors" 
                    >
                        <XIcon className="size-3" /> Reset
                    </button>
                )}

                {selectedTasks.length > 0 && (
                    <button 
                        type="button" 
                        onClick={handleDelete} 
                        className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-red-400 to-red-500 text-white text-sm transition-colors" 
                    >
                        <Trash className="size-3" /> Delete ({selectedTasks.length})
                    </button>
                )}
            </div>

            {/* 🆕 NEW: Empty state for folder tasks */}
            {folderId && filteredTasks.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <FolderIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                        No tasks in this folder
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                        Create tasks inside this folder to get started.
                    </p>
                </div>
            )}

            {/* Tasks Table */}
            <div className="overflow-auto rounded-lg lg:border border-zinc-300 dark:border-zinc-800">
                <div className="w-full">
                    {/* Desktop/Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full text-sm text-left bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-300">
                            <thead className="text-xs uppercase bg-zinc-50 dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400">
                                <tr>
                                    <th className="pl-2 pr-1">
                                        <input 
                                            onChange={() => selectedTasks.length === filteredTasks.length ? 
                                                setSelectedTasks([]) : 
                                                setSelectedTasks(filteredTasks.map((t) => t.id))
                                            } 
                                            checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0} 
                                            type="checkbox" 
                                            className="size-3 accent-zinc-600 dark:accent-zinc-500" 
                                        />
                                    </th>
                                    <th className="px-4 pl-0 py-3">Title</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Assigned To</th>
                                    <th className="px-4 py-3">Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => {
                                        const { icon: Icon, color } = typeIcons[task.type] || typeIcons.GENERAL_TASK;
                                        const { background, prioritycolor } = priorityTexts[task.priority] || priorityTexts.MEDIUM;

                                        return (
                                            <tr 
                                                key={task.id} 
                                                onClick={() => navigate(`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`)} 
                                                className="border-t border-zinc-300 dark:border-zinc-800 group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer" 
                                            >
                                                <td onClick={e => e.stopPropagation()} className="pl-2 pr-1">
                                                    <input 
                                                        type="checkbox" 
                                                        className="size-3 accent-zinc-600 dark:accent-zinc-500" 
                                                        onChange={() => selectedTasks.includes(task.id) ? 
                                                            setSelectedTasks(selectedTasks.filter((i) => i !== task.id)) : 
                                                            setSelectedTasks((prev) => [...prev, task.id])
                                                        } 
                                                        checked={selectedTasks.includes(task.id)} 
                                                    />
                                                </td>
                                                <td className="px-4 pl-0 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                                                    {task.title}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {Icon && <Icon className={`size-4 ${color}`} />}
                                                        <span className={`uppercase text-xs ${color}`}>
                                                            {task.type?.replace(/_/g, ' ') || "GENERAL TASK"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                        {task.priority || "MEDIUM"}
                                                    </span>
                                                </td>
                                                <td onClick={e => e.stopPropagation()} className="px-4 py-2">
                                                    <select 
                                                        name="status" 
                                                        onChange={(e) => handleStatusChange(task.id, e.target.value)} 
                                                        value={task.status} 
                                                        className={statusSelectClasses}
                                                        style={{
                                                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                                                            backgroundPosition: 'right 0.5rem center',
                                                            backgroundRepeat: 'no-repeat',
                                                            backgroundSize: '1.5em 1.5em'
                                                        }}
                                                    >
                                                        <option value="TODO">To Do</option>
                                                        <option value="IN_PROGRESS">In Progress</option>
                                                        <option value="INTERNAL_REVIEW">Internal Review</option>
                                                        <option value="DONE">Done</option>
                                                        <option value="CANCELLED">Cancelled</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    {renderAssignees(task)}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                                        <CalendarIcon className="size-4" />
                                                        {task.due_date ? format(new Date(task.due_date), "dd MMMM") : "No due date"}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    !folderId && (
                                        <tr>
                                            <td colSpan="7" className="text-center text-zinc-500 dark:text-zinc-400 py-6">
                                                No tasks found for the selected filters.
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Card View */}
                    <div className="lg:hidden flex flex-col gap-4 p-4 bg-white dark:bg-zinc-900">
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map((task) => {
                                const { icon: Icon, color } = typeIcons[task.type] || typeIcons.GENERAL_TASK;
                                const { background, prioritycolor } = priorityTexts[task.priority] || priorityTexts.MEDIUM;

                                return (
                                    <div 
                                        key={task.id} 
                                        className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 flex flex-col gap-3"
                                        onClick={() => navigate(`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-zinc-900 dark:text-zinc-200 text-sm font-semibold">{task.title}</h3>
                                            <input 
                                                type="checkbox" 
                                                className="size-4 accent-zinc-600 dark:accent-zinc-500" 
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    selectedTasks.includes(task.id) ? 
                                                        setSelectedTasks(selectedTasks.filter((i) => i !== task.id)) : 
                                                        setSelectedTasks((prev) => [...prev, task.id])
                                                }} 
                                                checked={selectedTasks.includes(task.id)} 
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                                {Icon && <Icon className={`size-4 ${color}`} />}
                                                <span className={`${color} uppercase`}>
                                                    {task.type?.replace(/_/g, ' ') || "GENERAL TASK"}
                                                </span>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                {task.priority || "MEDIUM"}
                                            </span>
                                        </div>

                                        <div onClick={e => e.stopPropagation()}>
                                            <label className="text-zinc-600 dark:text-zinc-400 text-xs">Status</label>
                                            <select 
                                                name="status" 
                                                onChange={(e) => handleStatusChange(task.id, e.target.value)} 
                                                value={task.status} 
                                                className="w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 outline-none px-2 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 appearance-none cursor-pointer"
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                                                    backgroundPosition: 'right 0.5rem center',
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundSize: '1.5em 1.5em',
                                                    paddingRight: '2.5rem'
                                                }}
                                            >
                                                <option value="TODO">To Do</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="INTERNAL_REVIEW">Internal Review</option>
                                                <option value="DONE">Done</option>
                                                <option value="CANCELLED">Cancelled</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            {renderMobileAssignees(task)}
                                            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                                <CalendarIcon className="size-4" />
                                                {task.due_date ? format(new Date(task.due_date), "dd MMM") : "No date"}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            !folderId && (
                                <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                                    No tasks found for the selected filters.
                                </p>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTasks;