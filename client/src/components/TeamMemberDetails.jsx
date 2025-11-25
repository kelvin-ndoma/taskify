// pages/TeamMemberDetails.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useUser, useAuth } from "@clerk/clerk-react";
import { 
  ArrowLeft, 
  Calendar, 
  Folder, 
  FileText, 
  Users, 
  Clock,
  CheckCircle2,
  PlayCircle,
  AlertCircle
} from "lucide-react";
import api from "../configs/api";

const TeamMemberDetails = () => {
  const { memberId } = useParams();
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace);
  const { getToken } = useAuth();
  
  const teamMember = currentWorkspace?.members?.find(member => 
    member.user.id === memberId
  );

  useEffect(() => {
    if (memberId && currentWorkspace) {
      fetchMemberTasks();
    }
  }, [memberId, currentWorkspace]);

  const fetchMemberTasks = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      // You'll need to create this API endpoint
      const response = await api.get(
        `/api/workspaces/${currentWorkspace.id}/members/${memberId}/tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAssignedTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching member tasks:', error);
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
        return <FileText className="w-4 h-4 text-gray-500" />;
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to="/team" 
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
            <img 
              src={teamMember.user.image || ''} 
              alt={teamMember.user.name}
              className="w-12 h-12 rounded-full bg-gray-200 dark:bg-zinc-800"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling?.style.display = 'flex';
              }}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {teamMember.user.name}
              </h1>
              <p className="text-gray-500 dark:text-zinc-400">
                {teamMember.user.email}
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
              {teamMember.user.name} doesn't have any assigned tasks in this workspace.
            </p>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([projectId, { project, folders }]) => (
            <div key={projectId} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
              {/* Project Header */}
              <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-blue-500" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {project?.name || 'Unknown Project'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                      {Object.values(folders).flatMap(f => f.tasks).length} tasks
                    </p>
                  </div>
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
                        <span>{folder.name}</span>
                        <span>•</span>
                        <span>{tasks.length} tasks</span>
                      </div>
                    )}

                    {/* Tasks List */}
                    <div className="space-y-2">
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex-shrink-0">
                            {getStatusIcon(task.status)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 dark:text-white truncate">
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

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Task Details
                </h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {selectedTask.title}
                  </h4>
                  <p className="text-gray-600 dark:text-zinc-300">
                    {selectedTask.description || 'No description provided.'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-zinc-400">Status:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedTask.status.replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-zinc-400">Priority:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedTask.priority}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-zinc-400">Project:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedTask.project?.name}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-zinc-400">Folder:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedTask.folder?.name || 'No Folder'}
                    </div>
                  </div>
                </div>
                
                {selectedTask.due_date && (
                  <div>
                    <span className="text-gray-500 dark:text-zinc-400">Due Date:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedTask.due_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMemberDetails;