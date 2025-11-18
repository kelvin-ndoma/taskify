import { format } from "date-fns";
import toast from "react-hot-toast";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  CalendarIcon, 
  MessageCircle, 
  PenIcon, 
  Users, 
  Edit3, 
  Trash2, 
  Save,
  X,
  UserPlus,
  UserMinus,
  LinkIcon,
  ExternalLinkIcon,
  PlusIcon,
  PaperclipIcon
} from "lucide-react";
import { useAuth, useUser } from "@clerk/clerk-react";
import api from "../configs/api";
import { fetchWorkspaces } from "../features/workspaceSlice";

const TaskDetails = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const taskId = searchParams.get("taskId");

  const { user } = useUser();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  
  // 🆕 Editing states
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingTaskData, setEditingTaskData] = useState({});
  const [taskLoading, setTaskLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  
  // 🆕 Assignee management states
  const [isManagingAssignees, setIsManagingAssignees] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");

  // 🆕 NEW: Comment link states
  const [commentLinks, setCommentLinks] = useState([]);
  const [showCommentLinkInput, setShowCommentLinkInput] = useState(false);
  const [commentLinkUrl, setCommentLinkUrl] = useState("");

  const { currentWorkspace } = useSelector((state) => state.workspace);

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

  // 🆕 UPDATED: Task Link Component (for TaskLink model)
  const TaskLink = ({ link }) => {
    const getDomainFromUrl = (url) => {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        return domain;
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
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 p-3 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group"
      >
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
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {link.title || domain}
            </h4>
            <ExternalLinkIcon className="size-3 text-gray-400 flex-shrink-0 mt-1" />
          </div>
          
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1 truncate">
            {link.url}
          </p>
        </div>
      </a>
    );
  };

  // 🆕 UPDATED: Comment Link Component (for CommentLink model - URL only)
  const CommentLink = ({ link }) => {
    const getDomainFromUrl = (url) => {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        return domain;
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
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 p-3 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group"
      >
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
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {domain}
            </h4>
            <ExternalLinkIcon className="size-3 text-gray-400 flex-shrink-0 mt-1" />
          </div>
          
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1 truncate">
            {link.url}
          </p>
        </div>
      </a>
    );
  };

  // 🆕 NEW: Add comment link
  const addCommentLink = () => {
    if (!commentLinkUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    // Basic URL validation
    let formattedUrl = commentLinkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      new URL(formattedUrl); // Validate URL
      
      const newLink = {
        url: formattedUrl,
        id: Date.now().toString() // temporary ID for frontend
      };

      setCommentLinks(prev => [...prev, newLink]);
      setCommentLinkUrl("");
      setShowCommentLinkInput(false);
      toast.success("Link added to comment!");
    } catch (error) {
      toast.error("Please enter a valid URL");
    }
  };

  // 🆕 NEW: Remove comment link
  const removeCommentLink = (linkId) => {
    setCommentLinks(prev => prev.filter(link => link.id !== linkId));
  };

  // 🆕 NEW: Extract and render links from text content
  const renderContentWithLinks = (content) => {
    if (!content) return null;

    const urlRegex = /(https?:\/\/[^\s<>{}\[\]\\^`|()]+[^\s<>{}\[\]\\^`|.,!?;)]\)?)/gi;
    
    const parts = content.split(urlRegex);
    const matches = content.match(urlRegex) || [];

    return parts.map((part, index) => {
      if (matches.includes(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            {part}
            <ExternalLinkIcon className="size-3" />
          </a>
        );
      }
      return part;
    });
  };

  // ✅ Fetch comments with correct endpoint
  const fetchComments = async () => {
    if (!taskId) return;
    try {
      const token = await getToken();
      if (!token) {
        console.warn("No valid token available for fetching comments.");
        return;
      }

      const { data } = await api.get(`/api/comments/task/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data?.comments) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error.response?.data || error.message);
      if (error.response?.status !== 404) {
        toast.error("Could not load comments.");
      }
    }
  };

  // ✅ UPDATED: Fetch task details directly from API to get links
  const fetchTaskDetails = async () => {
    setLoading(true);
    if (!taskId) {
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const { data } = await api.get(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.task) {
        console.log("Task with links:", data.task);
        setTask(data.task);
        
        // Use the project from the task response or fallback to Redux store
        if (data.task.project) {
          setProject(data.task.project);
        } else {
          // Fallback to Redux store if project not in response
          const proj = currentWorkspace?.projects?.find((p) => p.id === projectId);
          setProject(proj);
        }
        
        setEditingTaskData({
          title: data.task.title,
          description: data.task.description,
          status: data.task.status,
          type: data.task.type,
          priority: data.task.priority,
          due_date: data.task.due_date
        });
        
        // Set available members from project
        if (data.task.project?.members) {
          setAvailableMembers(data.task.project.members);
        } else {
          const proj = currentWorkspace?.projects?.find((p) => p.id === projectId);
          if (proj?.members) {
            setAvailableMembers(proj.members);
          }
        }
      } else {
        // Fallback to Redux store if API fails
        const proj = currentWorkspace?.projects?.find((p) => p.id === projectId);
        if (!proj) {
          setLoading(false);
          return;
        }

        const tsk = proj.tasks.find((t) => t.id === taskId);
        if (!tsk) {
          setLoading(false);
          return;
        }

        setTask(tsk);
        setProject(proj);
        setEditingTaskData({
          title: tsk.title,
          description: tsk.description,
          status: tsk.status,
          type: tsk.type,
          priority: tsk.priority,
          due_date: tsk.due_date
        });
        
        if (proj.members) {
          setAvailableMembers(proj.members);
        }
      }
    } catch (error) {
      console.error("Failed to fetch task from API, falling back to Redux:", error);
      
      // Fallback to Redux store
      const proj = currentWorkspace?.projects?.find((p) => p.id === projectId);
      if (!proj) {
        setLoading(false);
        return;
      }

      const tsk = proj.tasks.find((t) => t.id === taskId);
      if (!tsk) {
        setLoading(false);
        return;
      }

      setTask(tsk);
      setProject(proj);
      setEditingTaskData({
        title: tsk.title,
        description: tsk.description,
        status: tsk.status,
        type: tsk.type,
        priority: tsk.priority,
        due_date: tsk.due_date
      });
      
      if (proj.members) {
        setAvailableMembers(proj.members);
      }
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Update task function
  const handleUpdateTask = async () => {
    try {
      setTaskLoading(true);
      const token = await getToken();
      
      console.log("Updating task with data:", editingTaskData);
      
      const { data } = await api.put(
        `/api/tasks/${taskId}`,
        editingTaskData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Task update response:", data);

      setTask(data.task);
      setIsEditingTask(false);
      toast.success("Task updated successfully!");
      
      dispatch(fetchWorkspaces({ getToken }));
      
    } catch (error) {
      console.error("Update task error:", error);
      toast.error(error?.response?.data?.message || "Failed to update task");
    } finally {
      setTaskLoading(false);
    }
  };

  // 🆕 Add assignee to task
  const handleAddAssignee = async (memberId) => {
    try {
      const token = await getToken();
      
      // Get current assignees
      const currentAssignees = task.assignees?.map(assignee => assignee.user.id) || [];
      
      // Add new assignee
      const updatedAssignees = [...currentAssignees, memberId];
      
      const { data } = await api.put(
        `/api/tasks/${taskId}`,
        { 
          ...editingTaskData,
          assignees: updatedAssignees 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTask(data.task);
      setSelectedMember("");
      setIsManagingAssignees(false);
      toast.success("Assignee added successfully!");
      
      dispatch(fetchWorkspaces({ getToken }));
      
    } catch (error) {
      console.error("Add assignee error:", error);
      toast.error(error?.response?.data?.message || "Failed to add assignee");
    }
  };

  // 🆕 Remove assignee from task
  const handleRemoveAssignee = async (memberId) => {
    try {
      const token = await getToken();
      
      // Get current assignees and remove the specified one
      const currentAssignees = task.assignees?.map(assignee => assignee.user.id) || [];
      const updatedAssignees = currentAssignees.filter(id => id !== memberId);
      
      const { data } = await api.put(
        `/api/tasks/${taskId}`,
        { 
          ...editingTaskData,
          assignees: updatedAssignees 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTask(data.task);
      toast.success("Assignee removed successfully!");
      
      dispatch(fetchWorkspaces({ getToken }));
      
    } catch (error) {
      console.error("Remove assignee error:", error);
      toast.error(error?.response?.data?.message || "Failed to remove assignee");
    }
  };

  // 🆕 Start editing comment
  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  // 🆕 Cancel editing comment
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  // 🆕 Update comment
  const handleUpdateComment = async (commentId) => {
    if (!editingCommentContent.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      const token = await getToken();
      
      const { data } = await api.put(
        `/api/comments/${commentId}`,
        { content: editingCommentContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments(prev => prev.map(comment => 
        comment.id === commentId ? data.comment : comment
      ));
      
      setEditingCommentId(null);
      setEditingCommentContent("");
      toast.success("Comment updated successfully!");
      
    } catch (error) {
      console.error("Update comment error:", error);
      toast.error(error?.response?.data?.message || "Failed to update comment");
    }
  };

  // 🆕 Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const token = await getToken();
      
      await api.delete(
        `/api/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      toast.success("Comment deleted successfully!");
      
    } catch (error) {
      console.error("Delete comment error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete comment");
    }
  };

  // ✅ UPDATED: Add comment with links support
  const handleAddComment = async () => {
    if (!newComment.trim() && commentLinks.length === 0) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      setCommentLoading(true);
      toast.loading("Adding comment...");
      const token = await getToken();

      // 🆕 NEW: Prepare links data for comment
      const linksData = commentLinks.map(link => ({
        url: link.url
      }));

      const { data } = await api.post(
        `/api/comments`,
        { 
          taskId: task.id, 
          content: newComment,
          links: linksData // 🆕 NEW: Include links in request
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
      // 🆕 NEW: Reset comment links
      setCommentLinks([]);
      setCommentLinkUrl("");
      setShowCommentLinkInput(false);
      toast.dismissAll();
      toast.success("Comment added.");
    } catch (error) {
      toast.dismissAll();
      console.error("Add comment error:", error);
      toast.error(error?.response?.data?.message || error.message || "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  // 🆕 Check if user can edit/delete comment
  const canEditComment = (comment) => {
    return comment.user.id === user?.id;
  };

  // 🆕 Check if user can edit task
  const canEditTask = () => {
    if (!task || !user) return false;
    
    const isWorkspaceAdmin = currentWorkspace?.members?.some(
      member => member.user.id === user.id && member.role === "ADMIN"
    );
    const isProjectLead = project?.team_lead === user.id;
    const isTaskAssignee = task.assignees?.some(assignee => assignee.user.id === user.id);
    
    return isWorkspaceAdmin || isProjectLead || isTaskAssignee;
  };

  // 🆕 Get available members for assignment (not already assigned)
  const getAvailableMembers = () => {
    if (!availableMembers || !task.assignees) return availableMembers || [];
    
    const assignedUserIds = task.assignees.map(assignee => assignee.user.id);
    return availableMembers.filter(member => 
      !assignedUserIds.includes(member.user.id)
    );
  };

  // ✅ Load task details when route changes
  useEffect(() => {
    fetchTaskDetails();
  }, [taskId, projectId, currentWorkspace]);

  // ✅ Load comments whenever task changes or page revisits
  useEffect(() => {
    if (!taskId) return;
    
    fetchComments();
    const interval = setInterval(fetchComments, 30000);
    
    return () => clearInterval(interval);
  }, [taskId]);

  // 🆕 Debug: Log task data to see what we're getting
  useEffect(() => {
    if (task) {
      console.log("Current task data:", task);
      console.log("Task links:", task.links);
      console.log("Task description:", task.description);
    }
  }, [task]);

  // 🆕 Handle Enter key for comment submission
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddComment();
    }
  };

  if (loading) return <div className="text-gray-500 dark:text-zinc-400 px-4 py-6">Loading task details...</div>;
  if (!task) return <div className="text-red-500 px-4 py-6">Task not found.</div>;

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-6 sm:p-4 text-gray-900 dark:text-zinc-100 max-w-6xl mx-auto">
      {/* Left: Comments / Chatbox */}
      <div className="w-full lg:w-2/3">
        <div className="p-5 rounded-md border border-gray-300 dark:border-zinc-800 flex flex-col lg:h-[80vh]">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
            <MessageCircle className="size-5" /> Task Discussion ({comments.length})
          </h2>

          <div className="flex-1 md:overflow-y-scroll no-scrollbar">
            {comments.length > 0 ? (
              <div className="flex flex-col gap-4 mb-6 mr-2">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`sm:max-w-4/5 dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-900 border border-gray-300 dark:border-zinc-700 p-3 rounded-md ${
                      comment.user.id === user?.id ? "ml-auto bg-blue-50 dark:bg-blue-900/20" : "mr-auto"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
                        <UserAvatar user={comment.user} size={5} />
                        <span className="font-medium text-gray-900 dark:text-white">{comment.user.name}</span>
                        <span className="text-xs text-gray-400 dark:text-zinc-600">
                          • {format(new Date(comment.createdAt), "dd MMM yyyy, HH:mm")}
                        </span>
                      </div>
                      
                      {/* Comment Actions */}
                      {canEditComment(comment) && (
                        <div className="flex items-center gap-1">
                          {editingCommentId === comment.id ? (
                            <>
                              <button
                                onClick={() => handleUpdateComment(comment.id)}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Save"
                              >
                                <Save className="size-3" />
                              </button>
                              <button
                                onClick={cancelEditComment}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <X className="size-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditComment(comment)}
                                className="p-1 text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit3 className="size-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Editable Comment Content */}
                    {editingCommentId === comment.id ? (
                      <textarea
                        value={editingCommentContent}
                        onChange={(e) => setEditingCommentContent(e.target.value)}
                        className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded p-2 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <div className="text-sm text-gray-900 dark:text-zinc-200">
                        {renderContentWithLinks(comment.content)}
                      </div>
                    )}

                    {/* 🆕 UPDATED: Comment Links (using CommentLink model) */}
                    {comment.links && comment.links.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {comment.links.map((link) => (
                          <CommentLink key={link.id} link={link} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 dark:text-zinc-500">
                <MessageCircle className="size-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No comments yet.</p>
                <p className="text-xs mt-1">Be the first to start the discussion!</p>
              </div>
            )}
          </div>

          {/* 🆕 UPDATED: Add Comment with Links Support */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
            <div className="flex-1 w-full">
              {/* Comment Link Attachments */}
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <PaperclipIcon className="size-4" />
                    Attach Links to Comment
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCommentLinkInput(!showCommentLinkInput)}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <PlusIcon className="size-3" />
                    {showCommentLinkInput ? "Cancel" : "Add Link"}
                  </button>
                </div>

                {/* Comment Link Input */}
                {showCommentLinkInput && (
                  <div className="flex gap-2 p-3 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                    <input
                      type="url"
                      value={commentLinkUrl}
                      onChange={(e) => setCommentLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 rounded dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCommentLink())}
                    />
                    <button
                      type="button"
                      onClick={addCommentLink}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"
                    >
                      <PlusIcon className="size-3" />
                      Add
                    </button>
                  </div>
                )}

                {/* Comment Links Preview */}
                {commentLinks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      {commentLinks.length} link(s) attached to this comment
                    </p>
                    <div className="space-y-2 max-h-20 overflow-y-auto">
                      {commentLinks.map((link) => (
                        <div key={link.id} className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-500/10 p-2 rounded">
                          <LinkIcon className="size-3 text-blue-500 flex-shrink-0" />
                          <span className="truncate flex-1">{link.url}</span>
                          <button
                            type="button"
                            onClick={() => removeCommentLink(link.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Write a comment... (Ctrl+Enter to send)"
                className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md p-3 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                disabled={commentLoading}
              />
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Press Ctrl+Enter to send
              </p>
            </div>
            <button
              onClick={handleAddComment}
              disabled={(!newComment.trim() && commentLinks.length === 0) || commentLoading}
              className="bg-gradient-to-l from-blue-500 to-blue-600 transition-colors text-white text-sm px-6 py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {commentLoading ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Task + Project Info */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6">
        <div className="p-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              {isEditingTask ? (
                <input
                  value={editingTaskData.title}
                  onChange={(e) => setEditingTaskData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-lg font-medium bg-transparent border-b border-gray-300 dark:border-zinc-600 pb-1 focus:outline-none focus:border-blue-500"
                  placeholder="Task title"
                />
              ) : (
                <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-100">{task.title}</h1>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                {isEditingTask ? (
                  <>
                    {/* Task Status Options */}
                    <select
                      value={editingTaskData.status}
                      onChange={(e) => setEditingTaskData(prev => ({ ...prev, status: e.target.value }))}
                      className="px-2 py-0.5 rounded text-xs border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="INTERNAL_REVIEW">Internal Review</option>
                      <option value="DONE">Done</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    
                    {/* Task Type Options */}
                    <select
                      value={editingTaskData.type}
                      onChange={(e) => setEditingTaskData(prev => ({ ...prev, type: e.target.value }))}
                      className="px-2 py-0.5 rounded text-xs border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    >
                      <option value="GENERAL_TASK">General Task</option>
                      <option value="WEEKLY_EMAILS">Weekly Emails</option>
                      <option value="CALENDARS">Calendars</option>
                      <option value="CLIENT">Client</option>
                      <option value="SOCIAL">Social</option>
                      <option value="OTHER">Other</option>
                    </select>
                    
                    <select
                      value={editingTaskData.priority}
                      onChange={(e) => setEditingTaskData(prev => ({ ...prev, priority: e.target.value }))}
                      className="px-2 py-0.5 rounded text-xs border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-300 text-xs capitalize">
                      {task.status?.toLowerCase().replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-300 text-xs capitalize">
                      {task.type?.toLowerCase().replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-green-200 dark:bg-emerald-900 text-green-900 dark:text-emerald-300 text-xs capitalize">
                      {task.priority?.toLowerCase()}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Task Edit Button */}
            {canEditTask() && (
              <div className="flex gap-2">
                {isEditingTask ? (
                  <>
                    <button
                      onClick={handleUpdateTask}
                      disabled={taskLoading}
                      className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                      title="Save"
                    >
                      <Save className="size-4" />
                    </button>
                    <button
                      onClick={() => setIsEditingTask(false)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Cancel"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingTask(true)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                    title="Edit Task"
                  >
                    <Edit3 className="size-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Editable Description */}
          {isEditingTask ? (
            <textarea
              value={editingTaskData.description || ""}
              onChange={(e) => setEditingTaskData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Task description"
              className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded p-2 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={3}
            />
          ) : (
            task.description && (
              <div className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-4">
                {renderContentWithLinks(task.description)}
              </div>
            )
          )}

          {/* 🆕 UPDATED: Task Links (using TaskLink model) */}
          {task.links && task.links.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="size-4 text-gray-500 dark:text-zinc-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Attached Links</span>
              </div>
              <div className="space-y-2">
                {task.links.map((link) => (
                  <TaskLink key={link.id} link={link} />
                ))}
              </div>
            </div>
          )}

          {/* SAVE BUTTON FOR TASK UPDATES */}
          {isEditingTask && (
            <div className="flex justify-end gap-2 mb-4 pt-2 border-t border-gray-200 dark:border-zinc-700">
              <button
                onClick={() => setIsEditingTask(false)}
                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTask}
                disabled={taskLoading || !editingTaskData.title?.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="size-3" />
                {taskLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          <hr className="border-zinc-200 dark:border-zinc-700 my-3" />

          {/* Assignees Section with Management */}
          <div className="space-y-3 text-sm text-gray-700 dark:text-zinc-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-gray-500 dark:text-zinc-500" />
                <span className="font-medium">Assignees:</span>
              </div>
              
              {/* Manage Assignees Button */}
              {canEditTask() && !isEditingTask && (
                <button
                  onClick={() => setIsManagingAssignees(!isManagingAssignees)}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <UserPlus className="size-3" />
                  {isManagingAssignees ? "Cancel" : "Manage"}
                </button>
              )}
            </div>

            {/* Add Assignee Form */}
            {isManagingAssignees && canEditTask() && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
                  >
                    <option value="">Select team member...</option>
                    {getAvailableMembers().map((member) => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.name} ({member.user.email})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => selectedMember && handleAddAssignee(selectedMember)}
                    disabled={!selectedMember}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <UserPlus className="size-3" />
                  </button>
                </div>
                {getAvailableMembers().length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 text-center">
                    All team members are already assigned
                  </p>
                )}
              </div>
            )}

            {/* Assignees List */}
            {task.assignees && task.assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((assignee) => (
                  <div 
                    key={assignee.user?.id} 
                    className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full group relative"
                  >
                    <UserAvatar user={assignee.user} size={4} />
                    <span className="text-xs">{assignee.user?.name || "Unassigned"}</span>
                    
                    {/* Remove Assignee Button */}
                    {canEditTask() && (
                      <button
                        onClick={() => handleRemoveAssignee(assignee.user.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-600 hover:text-red-800 transition-opacity"
                        title="Remove assignee"
                      >
                        <UserMinus className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-zinc-400">No assignees</p>
            )}
            
            {/* Due Date */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-gray-500 dark:text-zinc-500" />
              <span>Due: </span>
              {isEditingTask ? (
                <input
                  type="date"
                  value={editingTaskData.due_date ? format(new Date(editingTaskData.due_date), "yyyy-MM-dd") : ""}
                  onChange={(e) => setEditingTaskData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
                />
              ) : (
                <span>{task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "No due date"}</span>
              )}
            </div>
          </div>
        </div>

        {project && (
          <div className="p-4 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-gray-300 dark:border-zinc-800">
            <p className="text-xl font-medium mb-4">Project Details</p>
            <h2 className="text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <PenIcon className="size-4" /> {project.name}
            </h2>
            <p className="text-xs mt-3">
              Project Start Date: {project.start_date ? format(new Date(project.start_date), "dd MMM yyyy") : "Not set"}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-zinc-400 mt-3">
              <span>Status: {project.status}</span>
              <span>Priority: {project.priority}</span>
              <span>Progress: {project.progress}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetails;