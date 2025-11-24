import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, XIcon, Users, LinkIcon, PlusIcon, PaperclipIcon, FolderIcon } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";
import { useAuth } from "@clerk/clerk-react";
import api from "../configs/api";
import toast from "react-hot-toast";
import { addTask } from "../features/workspaceSlice";

export default function CreateTaskDialog({ showCreateTask, setShowCreateTask, projectId, folderId }) {
    const { getToken } = useAuth();
    const dispatch = useDispatch();

    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const project = currentWorkspace?.projects.find((p) => p.id === projectId);
    const teamMembers = project?.members || [];
    const folders = project?.folders || [];

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "GENERAL_TASK",
        status: "TODO",
        priority: "MEDIUM",
        assignees: [],
        due_date: "",
        folderId: folderId || "", // NEW: Folder support with prop
    });

    // 🆕 NEW: State for task links (url + title)
    const [taskLinks, setTaskLinks] = useState([]);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkTitle, setLinkTitle] = useState("");

    // 🆕 Reset form when props change
    useEffect(() => {
        if (showCreateTask) {
            setFormData(prev => ({
                ...prev,
                folderId: folderId || ""
            }));
        }
    }, [showCreateTask, folderId]);

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

    // 🆕 NEW: Add task link
    const addTaskLink = () => {
        if (!linkUrl.trim()) {
            toast.error("Please enter a valid URL");
            return;
        }

        // Basic URL validation
        let formattedUrl = linkUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }

        try {
            new URL(formattedUrl); // Validate URL
            
            const newLink = {
                url: formattedUrl,
                title: linkTitle.trim() || "", // Title is optional for task links
                id: Date.now().toString() // temporary ID for frontend
            };

            setTaskLinks(prev => [...prev, newLink]);
            setLinkUrl("");
            setLinkTitle("");
            setShowLinkInput(false);
            toast.success("Link added successfully!");
        } catch (error) {
            toast.error("Please enter a valid URL");
        }
    };

    // 🆕 NEW: Remove task link
    const removeTaskLink = (linkId) => {
        setTaskLinks(prev => prev.filter(link => link.id !== linkId));
    };

    // 🆕 NEW: Link Preview Component
    const LinkPreview = ({ link, onRemove }) => {
        const getDomainFromUrl = (url) => {
            try {
                return new URL(url).hostname.replace('www.', '');
            } catch {
                return url;
            }
        };

        const getFaviconUrl = (url) => {
            try {
                const domain = new URL(url).hostname;
                return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            } catch {
                return null;
            }
        };

        const faviconUrl = getFaviconUrl(link.url);
        const domain = getDomainFromUrl(link.url);

        return (
            <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                        {faviconUrl ? (
                            <img 
                                src={faviconUrl} 
                                alt="" 
                                className="size-6 rounded"
                            />
                        ) : (
                            <div className="size-6 bg-blue-500 rounded flex items-center justify-center">
                                <LinkIcon className="size-3 text-white" />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate">
                            {link.title || domain}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {link.url}
                        </p>
                    </div>
                </div>
                
                <button
                    type="button"
                    onClick={() => onRemove(link.id)}
                    className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                >
                    <XIcon className="size-4" />
                </button>
            </div>
        );
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
            
            // 🆕 Prepare links data for backend
            const linksData = taskLinks.map(link => ({
                url: link.url,
                title: link.title || null // Send null if no title
            }));

            const { data } = await api.post(
                '/api/tasks', 
                { 
                    ...formData, 
                    links: linksData, // 🆕 NEW: Include links in request
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
                type: "GENERAL_TASK",
                status: "TODO",
                priority: "MEDIUM",
                assignees: [],
                due_date: "",
                folderId: folderId || "",
            });
            // 🆕 NEW: Reset links state
            setTaskLinks([]);
            setLinkUrl("");
            setLinkTitle("");
            setShowLinkInput(false);
            
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
            type: "GENERAL_TASK",
            status: "TODO",
            priority: "MEDIUM",
            assignees: [],
            due_date: "",
            folderId: folderId || "",
        });
        // 🆕 NEW: Reset links state
        setTaskLinks([]);
        setLinkUrl("");
        setLinkTitle("");
        setShowLinkInput(false);
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

                    {/* 🆕 NEW: Folder Selection */}
                    {folders.length > 0 && (
                        <div className="space-y-1">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <FolderIcon className="size-4" />
                                Folder (Optional)
                            </label>
                            <select 
                                value={formData.folderId} 
                                onChange={(e) => setFormData({ ...formData, folderId: e.target.value })} 
                                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            >
                                <option value="">No Folder (Root Level)</option>
                                {folders.map((folder) => (
                                    <option key={folder.id} value={folder.id}>
                                        {folder.name}
                                    </option>
                                ))}
                            </select>
                            {folderId && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    Currently in folder: {folders.find(f => f.id === folderId)?.name}
                                </p>
                            )}
                        </div>
                    )}

                    {/* 🆕 NEW: Task Links Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <PaperclipIcon className="size-4" />
                                Attach Links
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowLinkInput(!showLinkInput)}
                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                <PlusIcon className="size-3" />
                                {showLinkInput ? "Cancel" : "Add Link"}
                            </button>
                        </div>

                        {/* Link Input Form */}
                        {showLinkInput && (
                            <div className="space-y-2 p-3 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                                <div className="space-y-2">
                                    <input
                                        type="url"
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full rounded dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="text"
                                        value={linkTitle}
                                        onChange={(e) => setLinkTitle(e.target.value)}
                                        placeholder="Link title (optional)"
                                        className="w-full rounded dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={addTaskLink}
                                        disabled={!linkUrl.trim()}
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <PaperclipIcon className="size-3" />
                                        Attach Link
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Links Preview */}
                        {taskLinks.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                    {taskLinks.length} link(s) attached to this task
                                </p>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {taskLinks.map((link) => (
                                        <LinkPreview
                                            key={link.id}
                                            link={link}
                                            onRemove={removeTaskLink}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
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

                    {/* Multiple Assignees */}
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