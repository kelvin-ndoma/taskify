// components/ProjectTasks.jsx
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { deleteTask, updateTask } from "../features/workspaceSlice";
import { CalendarIcon, Trash, XIcon, Users, Mail, User, Heart, Circle, Square } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
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

// 🆕 User avatar component
const UserAvatar = ({ user, size = 5 }) => {
    const safeImage = getSafeImageUrl(user?.image);
    
    if (safeImage) {
        return (
            <img
                src={safeImage}
                alt={user?.name || "User"}
                className={`size-${size} rounded-full bg-gray-200 dark:bg-zinc-800`}
            />
        );
    }
    
    const initials = user?.name?.charAt(0)?.toUpperCase() || "U";
    return (
        <div className={`size-${size} rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-xs font-medium`}>
            {initials}
        </div>
    );
};

const ProjectTasks = ({ tasks }) => {
    const { getToken } = useAuth();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [selectedTasks, setSelectedTasks] = useState([]);

    const [filters, setFilters] = useState({
        status: "",
        type: "",
        priority: "",
        assignee: "",
    });

    // 🆕 Fix: Get unique assignee names from multiple assignees
    const assigneeList = useMemo(() => {
        const allAssignees = tasks.flatMap(task => 
            task.assignees?.map(assignee => assignee.user?.name).filter(Boolean) || []
        );
        return Array.from(new Set(allAssignees));
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            const { status, type, priority, assignee } = filters;
            
            // 🆕 Fix: Check if any assignee matches the filter
            const hasMatchingAssignee = !assignee || 
                task.assignees?.some(assigneeObj => assigneeObj.user?.name === assignee);
            
            return (
                (!status || task.status === status) &&
                (!type || task.type === type) &&
                (!priority || task.priority === priority) &&
                hasMatchingAssignee
            );
        });
    }, [filters, tasks]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            toast.loading("Updating status...");

            const token = await getToken();

            // Update task status
            await api.put(`/api/tasks/${taskId}`, { status: newStatus }, { 
                headers: { Authorization: `Bearer ${token}` } 
            });

            let updatedTask = structuredClone(tasks.find((t) => t.id === taskId));
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

            const token = await getToken();

            toast.loading("Deleting tasks...");

            // 🛠️ FIX: Use DELETE method for bulk deletion
            await api.delete("/api/tasks", { 
                data: { tasksIds: selectedTasks },
                headers: { Authorization: `Bearer ${token}` } 
            });

            dispatch(deleteTask(selectedTasks));
            setSelectedTasks([]); // Clear selection after deletion

            toast.dismissAll();
            toast.success("Tasks deleted successfully");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
        }
    };

    // 🆕 Render assignees for a task
    const renderAssignees = (task) => {
        if (!task.assignees || task.assignees.length === 0) {
            return <span className="text-zinc-400 dark:text-zinc-500">-</span>;
        }

        // Show first assignee and count for desktop
        if (task.assignees.length === 1) {
            const assignee = task.assignees[0];
            return (
                <div className="flex items-center gap-2">
                    <UserAvatar user={assignee.user} size={5} />
                    <span>{assignee.user?.name || "Unknown"}</span>
                </div>
            );
        }

        // Show multiple assignees with count
        return (
            <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                    {task.assignees.slice(0, 2).map((assignee, index) => (
                        <div key={assignee.user?.id || index} className="relative">
                            <UserAvatar user={assignee.user} size={5} />
                        </div>
                    ))}
                    {task.assignees.length > 2 && (
                        <div className="size-5 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-zinc-800">
                            +{task.assignees.length - 2}
                        </div>
                    )}
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {task.assignees.length} assignees
                </span>
            </div>
        );
    };

    // 🆕 Render mobile assignees view
    const renderMobileAssignees = (task) => {
        if (!task.assignees || task.assignees.length === 0) {
            return <span className="text-zinc-400 dark:text-zinc-500">No assignees</span>;
        }

        return (
            <div className="flex items-center gap-2">
                <Users className="size-4 text-zinc-500 dark:text-zinc-400" />
                <span className="text-sm">
                    {task.assignees.length} assignee{task.assignees.length !== 1 ? 's' : ''}
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
                            ...assigneeList.map((n) => ({ label: n, value: n })),
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
                                    <th className="px-4 py-3">Assignees</th>
                                    <th className="px-4 py-3">Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => {
                                        const { icon: Icon, color } = typeIcons[task.type] || {};
                                        const { background, prioritycolor } = priorityTexts[task.priority] || {};

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
                                                <td className="px-4 pl-0 py-2">{task.title}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {Icon && <Icon className={`size-4 ${color}`} />}
                                                        <span className={`uppercase text-xs ${color}`}>
                                                            {task.type?.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                        {task.priority}
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
                                                        {format(new Date(task.due_date), "dd MMMM")}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center text-zinc-500 dark:text-zinc-400 py-6">
                                            No tasks found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Card View */}
                    <div className="lg:hidden flex flex-col gap-4 p-4 bg-white dark:bg-zinc-900">
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map((task) => {
                                const { icon: Icon, color } = typeIcons[task.type] || {};
                                const { background, prioritycolor } = priorityTexts[task.priority] || {};

                                return (
                                    <div 
                                        key={task.id} 
                                        className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 flex flex-col gap-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-zinc-900 dark:text-zinc-200 text-sm font-semibold">{task.title}</h3>
                                            <input 
                                                type="checkbox" 
                                                className="size-4 accent-zinc-600 dark:accent-zinc-500" 
                                                onChange={() => selectedTasks.includes(task.id) ? 
                                                    setSelectedTasks(selectedTasks.filter((i) => i !== task.id)) : 
                                                    setSelectedTasks((prev) => [...prev, task.id])
                                                } 
                                                checked={selectedTasks.includes(task.id)} 
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                                {Icon && <Icon className={`size-4 ${color}`} />}
                                                <span className={`${color} uppercase`}>
                                                    {task.type?.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                {task.priority}
                                            </span>
                                        </div>

                                        <div>
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
                                                {format(new Date(task.due_date), "dd MMM")}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                                No tasks found for the selected filters.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTasks;