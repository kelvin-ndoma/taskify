// components/AssigneesManager.js
import React from 'react';
import { format } from "date-fns";
import { CalendarIcon, Users, UserPlus, UserMinus } from "lucide-react";
import UserAvatar from './UserAvatar';

const AssigneesManager = ({
  task,
  isEditingTask,
  editingTaskData,
  isManagingAssignees,
  availableMembers,
  selectedMember,
  canEditTask,
  onManageAssigneesToggle,
  onMemberSelect,
  onAddAssignee,
  onRemoveAssignee,
  onTaskDataChange
}) => {
  // Get available members for assignment (not already assigned)
  const getAvailableMembers = () => {
    if (!availableMembers || !task.assignees) return availableMembers || [];
    
    const assignedUserIds = task.assignees.map(assignee => assignee.user.id);
    return availableMembers.filter(member => 
      !assignedUserIds.includes(member.user.id)
    );
  };

  return (
    <div className="space-y-3 text-sm text-gray-700 dark:text-zinc-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-gray-500 dark:text-zinc-500" />
          <span className="font-medium">Assignees:</span>
        </div>
        
        {/* Manage Assignees Button */}
        {canEditTask && !isEditingTask && (
          <button
            onClick={onManageAssigneesToggle}
            className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <UserPlus className="size-3" />
            {isManagingAssignees ? "Cancel" : "Manage"}
          </button>
        )}
      </div>

      {/* Add Assignee Form */}
      {isManagingAssignees && canEditTask && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={selectedMember}
              onChange={onMemberSelect}
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
              onClick={() => selectedMember && onAddAssignee(selectedMember)}
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
              {canEditTask && (
                <button
                  onClick={() => onRemoveAssignee(assignee.user.id)}
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
            onChange={(e) => onTaskDataChange('due_date', e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
          />
        ) : (
          <span>{task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "No due date"}</span>
        )}
      </div>
    </div>
  );
};

export default AssigneesManager;