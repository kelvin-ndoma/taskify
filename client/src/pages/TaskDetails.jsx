// TaskDetails.jsx
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLinkIcon } from "lucide-react";
import { useAuth, useUser } from "@clerk/clerk-react";
import api from "../configs/api";
import { fetchWorkspaces } from "../features/workspaceSlice";
import CommentsSection from "../components/CommentsSection";
import TaskInfoPanel from "../components/TaskInfoPanel";

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
  
  // Editing states
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingTaskData, setEditingTaskData] = useState({});
  const [taskLoading, setTaskLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  
  // Assignee management states
  const [isManagingAssignees, setIsManagingAssignees] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");

  // Comment link states
  const [commentLinks, setCommentLinks] = useState([]);
  const [showCommentLinkInput, setShowCommentLinkInput] = useState(false);
  const [commentLinkUrl, setCommentLinkUrl] = useState("");

  const { currentWorkspace } = useSelector((state) => state.workspace);

  // Helper functions
  const canEditTask = () => {
    if (!task || !user) return false;
    
    const isWorkspaceAdmin = currentWorkspace?.members?.some(
      member => member?.user?.id === user.id && member.role === "ADMIN"
    );
    const isProjectLead = project?.team_lead === user.id;
    const isTaskAssignee = task.assignees?.some(assignee => assignee?.user?.id === user.id);
    
    return isWorkspaceAdmin || isProjectLead || isTaskAssignee;
  };

  // API functions
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
        
        // Ensure assignees array exists and has proper structure
        const safeTask = {
          ...data.task,
          assignees: Array.isArray(data.task.assignees) 
            ? data.task.assignees.filter(assignee => assignee?.user != null)
            : []
        };
        
        setTask(safeTask);
        
        if (data.task.project) {
          setProject(data.task.project);
        } else {
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
        
        // Safely set available members
        if (data.task.project?.members) {
          const safeMembers = data.task.project.members.filter(member => member?.user != null);
          setAvailableMembers(safeMembers);
        } else {
          const proj = currentWorkspace?.projects?.find((p) => p.id === projectId);
          if (proj?.members) {
            const safeMembers = proj.members.filter(member => member?.user != null);
            setAvailableMembers(safeMembers);
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

        // Ensure assignees array exists
        const safeTask = {
          ...tsk,
          assignees: Array.isArray(tsk.assignees) 
            ? tsk.assignees.filter(assignee => assignee?.user != null)
            : []
        };

        setTask(safeTask);
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
          const safeMembers = proj.members.filter(member => member?.user != null);
          setAvailableMembers(safeMembers);
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

      // Ensure assignees array exists
      const safeTask = {
        ...tsk,
        assignees: Array.isArray(tsk.assignees) 
          ? tsk.assignees.filter(assignee => assignee?.user != null)
          : []
      };

      setTask(safeTask);
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
        const safeMembers = proj.members.filter(member => member?.user != null);
        setAvailableMembers(safeMembers);
      }
    } finally {
      setLoading(false);
    }
  };

  // Task handlers - REMOVED fetchWorkspaces dispatches
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

      // Ensure assignees array exists in the updated task
      const safeTask = {
        ...data.task,
        assignees: Array.isArray(data.task.assignees) 
          ? data.task.assignees.filter(assignee => assignee?.user != null)
          : []
      };

      setTask(safeTask);
      setIsEditingTask(false);
      toast.success("Task updated successfully!");
      
      // REMOVED: dispatch(fetchWorkspaces({ getToken }));
      
    } catch (error) {
      console.error("Update task error:", error);
      toast.error(error?.response?.data?.message || "Failed to update task");
    } finally {
      setTaskLoading(false);
    }
  };

  const handleAddAssignee = async (memberId) => {
    try {
      const token = await getToken();
      
      // Safely get current assignee IDs
      const currentAssignees = (task.assignees || [])
        .map(assignee => assignee?.user?.id)
        .filter(id => id != null);
      
      const updatedAssignees = [...currentAssignees, memberId];
      
      const { data } = await api.put(
        `/api/tasks/${taskId}`,
        { 
          ...editingTaskData,
          assignees: updatedAssignees 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Ensure assignees array exists in the updated task
      const safeTask = {
        ...data.task,
        assignees: Array.isArray(data.task.assignees) 
          ? data.task.assignees.filter(assignee => assignee?.user != null)
          : []
      };

      setTask(safeTask);
      setSelectedMember("");
      setIsManagingAssignees(false);
      toast.success("Assignee added successfully!");
      
      // REMOVED: dispatch(fetchWorkspaces({ getToken }));
      
    } catch (error) {
      console.error("Add assignee error:", error);
      toast.error(error?.response?.data?.message || "Failed to add assignee");
    }
  };

  const handleRemoveAssignee = async (memberId) => {
    try {
      const token = await getToken();
      
      // Safely get current assignee IDs
      const currentAssignees = (task.assignees || [])
        .map(assignee => assignee?.user?.id)
        .filter(id => id != null);
      
      const updatedAssignees = currentAssignees.filter(id => id !== memberId);
      
      const { data } = await api.put(
        `/api/tasks/${taskId}`,
        { 
          ...editingTaskData,
          assignees: updatedAssignees 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Ensure assignees array exists in the updated task
      const safeTask = {
        ...data.task,
        assignees: Array.isArray(data.task.assignees) 
          ? data.task.assignees.filter(assignee => assignee?.user != null)
          : []
      };

      setTask(safeTask);
      toast.success("Assignee removed successfully!");
      
      // REMOVED: dispatch(fetchWorkspaces({ getToken }));
      
    } catch (error) {
      console.error("Remove assignee error:", error);
      toast.error(error?.response?.data?.message || "Failed to remove assignee");
    }
  };

  // Comment handlers
  const handleAddComment = async () => {
    if (!newComment.trim() && commentLinks.length === 0) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      setCommentLoading(true);
      toast.loading("Adding comment...");
      const token = await getToken();

      const linksData = commentLinks.map(link => ({
        url: link.url
      }));

      const { data } = await api.post(
        `/api/comments`,
        { 
          taskId: task.id, 
          content: newComment,
          links: linksData
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
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

  const addCommentLink = () => {
    if (!commentLinkUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    let formattedUrl = commentLinkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      new URL(formattedUrl);
      
      const newLink = {
        url: formattedUrl,
        id: Date.now().toString()
      };

      setCommentLinks(prev => [...prev, newLink]);
      setCommentLinkUrl("");
      setShowCommentLinkInput(false);
      toast.success("Link added to comment!");
    } catch (error) {
      toast.error("Please enter a valid URL");
    }
  };

  const removeCommentLink = (linkId) => {
    setCommentLinks(prev => prev.filter(link => link.id !== linkId));
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddComment();
    }
  };

  // useEffect hooks
  useEffect(() => {
    fetchTaskDetails();
  }, [taskId, projectId, currentWorkspace]);

  useEffect(() => {
    if (!taskId) return;
    
    fetchComments();
    const interval = setInterval(fetchComments, 30000);
    
    return () => clearInterval(interval);
  }, [taskId]);

  useEffect(() => {
    if (task) {
      console.log("Current task data:", task);
      console.log("Task assignees:", task.assignees);
      console.log("Task links:", task.links);
      console.log("Task description:", task.description);
      
      // Debug: Check for problematic assignees
      if (task.assignees) {
        task.assignees.forEach((assignee, index) => {
          if (!assignee?.user?.id) {
            console.warn(`Problematic assignee at index ${index}:`, assignee);
          }
        });
      }
    }
  }, [task]);

  if (loading) return <div className="text-gray-500 dark:text-zinc-400 px-4 py-6">Loading task details...</div>;
  if (!task) return <div className="text-red-500 px-4 py-6">Task not found.</div>;

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-6 sm:p-4 text-gray-900 dark:text-zinc-100 max-w-6xl mx-auto">
      <CommentsSection
        comments={comments}
        user={user}
        newComment={newComment}
        commentLinks={commentLinks}
        showCommentLinkInput={showCommentLinkInput}
        commentLinkUrl={commentLinkUrl}
        commentLoading={commentLoading}
        editingCommentId={editingCommentId}
        editingCommentContent={editingCommentContent}
        onCommentChange={(e) => setNewComment(e.target.value)}
        onKeyPress={handleKeyPress}
        onAddComment={handleAddComment}
        onStartEditComment={startEditComment}
        onCancelEditComment={cancelEditComment}
        onUpdateComment={handleUpdateComment}
        onDeleteComment={handleDeleteComment}
        onEditingCommentContentChange={setEditingCommentContent}
        onAddLinkClick={() => setShowCommentLinkInput(!showCommentLinkInput)}
        onLinkUrlChange={(e) => setCommentLinkUrl(e.target.value)}
        onAddCommentLink={addCommentLink}
        onRemoveCommentLink={removeCommentLink}
      />

      <TaskInfoPanel
        task={task}
        project={project}
        isEditingTask={isEditingTask}
        editingTaskData={editingTaskData}
        taskLoading={taskLoading}
        isManagingAssignees={isManagingAssignees}
        availableMembers={availableMembers}
        selectedMember={selectedMember}
        canEditTask={canEditTask()}
        onTaskDataChange={(field, value) => setEditingTaskData(prev => ({ ...prev, [field]: value }))}
        onTaskUpdate={handleUpdateTask}
        onEditToggle={() => setIsEditingTask(!isEditingTask)}
        onManageAssigneesToggle={() => setIsManagingAssignees(!isManagingAssignees)}
        onMemberSelect={(e) => setSelectedMember(e.target.value)}
        onAddAssignee={handleAddAssignee}
        onRemoveAssignee={handleRemoveAssignee}
      />
    </div>
  );
};

export default TaskDetails;