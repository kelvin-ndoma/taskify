// TaskDetails.js
import React, { useEffect, useState } from 'react';
import { useSearchParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";

import api from "../configs/api";
import { fetchWorkspaces } from "../features/workspaceSlice";
import CommentsSection from "./components/CommentsSection";
import TaskInfoPanel from "./components/TaskInfoPanel";
import { getSafeImageUrl, renderContentWithLinks } from "../utils/helpers";

const TaskDetails = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const taskId = searchParams.get("taskId");

  const { user } = useUser();
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const { currentWorkspace } = useSelector((state) => state.workspace);

  // State
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Task states
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingTaskData, setEditingTaskData] = useState({});
  const [taskLoading, setTaskLoading] = useState(false);
  const [isManagingAssignees, setIsManagingAssignees] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  
  // Comment states
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [commentLinks, setCommentLinks] = useState([]);
  const [showCommentLinkInput, setShowCommentLinkInput] = useState(false);
  const [commentLinkUrl, setCommentLinkUrl] = useState("");

  // Helper functions
  const canEditTask = () => {
    if (!task || !user) return false;
    const isWorkspaceAdmin = currentWorkspace?.members?.some(
      member => member.user.id === user.id && member.role === "ADMIN"
    );
    const isProjectLead = project?.team_lead === user.id;
    const isTaskAssignee = task.assignees?.some(assignee => assignee.user.id === user.id);
    return isWorkspaceAdmin || isProjectLead || isTaskAssignee;
  };

  // API functions
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
        setTask(data.task);
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
        
        if (data.task.project?.members) {
          setAvailableMembers(data.task.project.members);
        }
      }
    } catch (error) {
      console.error("Failed to fetch task:", error);
      // Fallback logic...
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!taskId) return;
    try {
      const token = await getToken();
      const { data } = await api.get(`/api/comments/task/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.comments) setComments(data.comments);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

  // Event handlers
  const handleUpdateTask = async () => {
    try {
      setTaskLoading(true);
      const token = await getToken();
      const { data } = await api.put(
        `/api/tasks/${taskId}`,
        editingTaskData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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

  const handleAddComment = async () => {
    if (!newComment.trim() && commentLinks.length === 0) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      setCommentLoading(true);
      const token = await getToken();
      const linksData = commentLinks.map(link => ({ url: link.url }));
      
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
      toast.success("Comment added.");
    } catch (error) {
      console.error("Add comment error:", error);
      toast.error(error?.response?.data?.message || "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  // Add other handlers (updateComment, deleteComment, addAssignee, etc.)

  // useEffect hooks
  useEffect(() => {
    if (taskId && projectId) {
      fetchTaskDetails();
    }
  }, [taskId, projectId]);

  useEffect(() => {
    if (!taskId) return;
    fetchComments();
    const interval = setInterval(fetchComments, 30000);
    return () => clearInterval(interval);
  }, [taskId]);

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
        onKeyPress={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleAddComment();
          }
        }}
        onAddComment={handleAddComment}
        onStartEditComment={(comment) => {
          setEditingCommentId(comment.id);
          setEditingCommentContent(comment.content);
        }}
        onCancelEditComment={() => {
          setEditingCommentId(null);
          setEditingCommentContent("");
        }}
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