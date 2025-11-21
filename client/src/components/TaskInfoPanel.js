// components/TaskInfoPanel.js
import React from 'react';
import { format } from "date-fns";
import { CalendarIcon, Users, UserPlus, UserMinus, Save, LinkIcon, PenIcon } from "lucide-react";
import UserAvatar from './UserAvatar';
import TaskLink from './TaskLink';
import ProjectDetails from './ProjectDetails';
import { renderContentWithLinks } from '../utils/helpers';

const TaskInfoPanel = ({
  task,
  project,
  isEditingTask,
  editingTaskData,
  taskLoading,
  isManagingAssignees,
  availableMembers,
  selectedMember,
  canEditTask,
  onTaskDataChange,
  onTaskUpdate,
  onEditToggle,
  onManageAssigneesToggle,
  onMemberSelect,
  onAddAssignee,
  onRemoveAssignee
}) => {
  const getAvailableMembers = () => {
    if (!availableMembers || !task.assignees) return availableMembers || [];
    const assignedUserIds = task.assignees.map(assignee => assignee.user.id);
    return availableMembers.filter(member => !assignedUserIds.includes(member.user.id));
  };

  return (
    <div className="w-full lg:w-1/2 flex flex-col gap-6">
      <div className="p-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800">
        <TaskHeader
          task={task}
          isEditingTask={isEditingTask}
          editingTaskData={editingTaskData}
          taskLoading={taskLoading}
          canEditTask={canEditTask}
          onEditToggle={onEditToggle}
          onTaskUpdate={onTaskUpdate}
          onTaskDataChange={onTaskDataChange}
        />

        {/* Editable Description */}
        {isEditingTask ? (
          <textarea
            value={editingTaskData.description || ""}
            onChange={(e) => onTaskDataChange('description', e.target.value)}
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

        {/* Task Links */}
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
              onClick={onEditToggle}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onTaskUpdate}
              disabled={taskLoading || !editingTaskData.title?.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="size-3" />
              {taskLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        <hr className="border-zinc-200 dark:border-zinc-700 my-3" />

        {/* Assignees Section */}
        <div className="space-y-3 text-sm text-gray-700 dark:text-zinc-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-gray-500 dark:text-zinc-500" />
              <span className="font-medium">Assignees:</span>
            </div>
            
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
      </div>

      {project && <ProjectDetails project={project} />}
    </div>
  );
};

export default TaskInfoPanel;