// components/TaskHeader.js
import React from 'react';
import { Edit3, Save, X } from "lucide-react";

const TaskHeader = ({
  task,
  isEditingTask,
  editingTaskData,
  taskLoading,
  canEditTask,
  onEditToggle,
  onTaskUpdate,
  onTaskDataChange
}) => {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        {isEditingTask ? (
          <input
            value={editingTaskData.title}
            onChange={(e) => onTaskDataChange('title', e.target.value)}
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
                onChange={(e) => onTaskDataChange('status', e.target.value)}
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
                onChange={(e) => onTaskDataChange('type', e.target.value)}
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
                onChange={(e) => onTaskDataChange('priority', e.target.value)}
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
      {canEditTask && (
        <div className="flex gap-2">
          {isEditingTask ? (
            <>
              <button
                onClick={onTaskUpdate}
                disabled={taskLoading}
                className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                title="Save"
              >
                <Save className="size-4" />
              </button>
              <button
                onClick={onEditToggle}
                className="p-1 text-red-600 hover:text-red-800"
                title="Cancel"
              >
                <X className="size-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onEditToggle}
              className="p-1 text-blue-600 hover:text-blue-800"
              title="Edit Task"
            >
              <Edit3 className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskHeader;