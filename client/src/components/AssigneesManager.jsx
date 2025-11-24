// components/AssigneesManager.js - ALTERNATIVE VERSION
import React from 'react';
import { format } from "date-fns";
import { CalendarIcon, Users, UserPlus, UserMinus, CheckCircle } from "lucide-react";
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
  // Safely get all workspace members
  const getAllWorkspaceMembers = () => {
    if (!availableMembers || !Array.isArray(availableMembers)) return [];
    
    return availableMembers.filter(member => 
      member?.user?.id != null && member?.user?.name != null
    );
  };

  // Safely get assignees with fallbacks
  const safeAssignees = (task.assignees || []).filter(assignee => 
    assignee?.user?.id != null
  );

  // Get assigned user IDs for quick lookup
  const assignedUserIds = safeAssignees.map(assignee => assignee.user.id);
  
  const allMembers = getAllWorkspaceMembers();

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
              {allMembers.map((member) => {
                const isAssigned = assignedUserIds.includes(member.user.id);
                
                return (
                  <option 
                    key={member.user.id} 
                    value={member.user.id}
                    disabled={isAssigned}
                    className={isAssigned ? 'text-gray-400 bg-gray-100' : ''}
                  >
                    {member.user.name} ({member.user.email})
                    {isAssigned && ' ✓'}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => selectedMember && onAddAssignee(selectedMember)}
              disabled={!selectedMember || assignedUserIds.includes(selectedMember)}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <UserPlus className="size-3" />
              Add
            </button>
          </div>
          
          {/* Assignment status */}
          <div className="text-xs text-gray-500 dark:text-zinc-400 text-center">
            {safeAssignees.length} of {allMembers.length} members assigned
          </div>
        </div>
      )}

      {/* Current Assignees */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-zinc-400">
          <CheckCircle className="size-3" />
          Currently assigned ({safeAssignees.length})
        </div>
        
        {safeAssignees.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {safeAssignees.map((assignee) => (
              <div 
                key={assignee.user.id} 
                className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full group relative border border-green-200 dark:border-green-800"
              >
                <UserAvatar user={assignee.user} size={4} />
                <span className="text-xs">{assignee.user.name}</span>
                
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
          <p className="text-sm text-gray-500 dark:text-zinc-400 italic">No one assigned yet</p>
        )}
      </div>
      
      {/* Due Date */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-zinc-700">
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
          <span className={task.due_date ? "" : "text-gray-500 italic"}>
            {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "No due date set"}
          </span>
        )}
      </div>
    </div>
  );
};

export default AssigneesManager;