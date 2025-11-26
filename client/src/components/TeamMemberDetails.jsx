// pages/TeamMemberDetails.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { 
  ArrowLeft, 
  Calendar, 
  Folder, 
  FileText, 
  Users, 
  Clock,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  Circle,
  ExternalLink
} from "lucide-react";
import api from "../configs/api";
import toast from "react-hot-toast";

const TeamMemberDetails = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [memberInfo, setMemberInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace);
  const { user: currentUser, getToken } = useAuth();

  // Find team member from workspace data
  const teamMember = currentWorkspace?.members?.find(member => 
    member.user.id === memberId
  ) || memberInfo;

  useEffect(() => {
    if (memberId && currentWorkspace) {
      fetchMemberTasks();
    }
  }, [memberId, currentWorkspace]);

  const fetchMemberTasks = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      // Use the new team API endpoint
      const response = await api.get(
        `/api/team/${currentWorkspace.id}/members/${memberId}/tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAssignedTasks(response.data.tasks || []);
      setMemberInfo(response.data.member);
    } catch (error) {
      console.error('Error fetching member tasks:', error);
      toast.error(error.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Group tasks by project and folder
  const groupedTasks = assignedTasks.reduce((acc, task) => {
    const projectId = task.project?.id || 'unknown';
    const folderId = task.folder?.id || 'root';
    
    if (!acc[projectId]) {
      acc[projectId] = {
        project: task.project,
        folders: {}
      };
    }
    
    if (!acc[projectId].folders[folderId]) {
      acc[projectId].folders[folderId] = {
        folder: task.folder,
        tasks: []
      };
    }
    
    acc[projectId].folders[folderId].tasks.push(task);
    return acc;
  }, {});

  const getStatusIcon = (status) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'IN_PROGRESS':
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'INTERNAL_REVIEW':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'text-red-500 bg-red-100 dark:bg-red-500/10';
      case 'MEDIUM':
        return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-500/10';
      case 'LOW':
        return 'text-green-500 bg-green-100 dark:bg-green-500/10';
      default:
        return 'text-gray-500 bg-gray-100 dark:bg-gray-500/10';
    }
  };

  const handleTaskClick = (task) => {
    // Navigate to task details page
    navigate(`/taskDetails?taskId=${task.id}`);
  };

  const handleProjectClick = (projectId) => {
    // Navigate to project details
    navigate(`/projectsDetail?projectId=${projectId}`);
  };

  // Get user avatar content
  const getUserAvatar = (user) => {
    if (user?.image) {
      return (
        <img 
          src={user.image} 
          alt={user.name}
          className="w-12 h-12 rounded-full bg-gray-200 dark:bg-zinc-800 object-cover"
        />
      );
    }
    
    // Return fallback avatar with initial
    return (
      <div className="w-12 h-12 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-medium text-lg">
        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-zinc-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!teamMember) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-gray-400 dark:text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Team Member Not Found
          </h2>
          <p className="text-gray-500 dark:text-zinc-400 mb-6">
            The team member you're looking for doesn't exist or you don't have access.
          </p>
          <Link 
            to="/team" 
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Link>
        </div>
      </div>
    );
  }

  const isCurrentUser = teamMember.user?.id === currentUser?.id;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/team" 
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="relative">
              {getUserAvatar(teamMember.user)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {teamMember.user?.name}
                {isCurrentUser && (
                  <span className="text-sm text-blue-500 ml-2">(You)</span>
                )}
              </h1>
              <p className="text-gray-500 dark:text-zinc-400">
                {teamMember.user?.email}
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-zinc-400">Total Assigned Tasks</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {assignedTasks.length}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-zinc-400">To Do</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {assignedTasks.filter(t => t.status === 'TODO').length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-zinc-400">In Progress</div>
          <div className="text-xl font-bold text-blue-500">
            {assignedTasks.filter(t => t.status === 'IN_PROGRESS').length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-zinc-400">In Review</div>
          <div className="text-xl font-bold text-orange-500">
            {assignedTasks.filter(t => t.status === 'INTERNAL_REVIEW').length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-zinc-400">Completed</div>
          <div className="text-xl font-bold text-green-500">
            {assignedTasks.filter(t => t.status === 'DONE').length}
          </div>
        </div>
      </div>

      {/* Tasks by Project & Folder */}
      <div className="space-y-6">
        {Object.keys(groupedTasks).length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg">
            <FileText className="w-16 h-16 text-gray-400 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Assigned Tasks
            </h3>
            <p className="text-gray-500 dark:text-zinc-400">
              {isCurrentUser ? "You don't" : `${teamMember.user?.name} doesn't`} have any assigned tasks in this workspace.
            </p>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([projectId, { project, folders }]) => (
            <div key={projectId} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              {/* Project Header */}
              <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Folder className="w-5 h-5 text-blue-500" />
                    <div>
                      <button
                        onClick={() => handleProjectClick(projectId)}
                        className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        {project?.name || 'Unknown Project'}
                      </button>
                      <p className="text-sm text-gray-500 dark:text-zinc-400">
                        {Object.values(folders).flatMap(f => f.tasks).length} tasks
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Folders and Tasks */}
              <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                {Object.entries(folders).map(([folderId, { folder, tasks }]) => (
                  <div key={folderId} className="p-4">
                    {/* Folder Header */}
                    {folder && (
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-zinc-400">
                        <Folder className="w-4 h-4" />
                        <span className="font-medium">{folder.name}</span>
                        <span>•</span>
                        <span>{tasks.length} tasks</span>
                      </div>
                    )}

                    {/* Tasks List */}
                    <div className="space-y-2">
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors group"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex-shrink-0">
                            {getStatusIcon(task.status)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {task.title}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
                              {task.due_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(task.due_date).toLocaleDateString()}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(task.createdAt).toLocaleDateString()}
                              </div>
                              {task._count?.comments > 0 && (
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {task._count.comments} comments
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right text-xs text-gray-500 dark:text-zinc-400">
                            <div className={`px-2 py-1 rounded ${
                              task.status === 'DONE' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300' :
                              task.status === 'IN_PROGRESS' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300' :
                              task.status === 'INTERNAL_REVIEW' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300' :
                              'bg-gray-100 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamMemberDetails;