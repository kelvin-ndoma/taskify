// components/TaskInfoPanel.js - ENHANCED VERSION
import React from 'react';
import { Save, LinkIcon, PenIcon, ExternalLinkIcon } from "lucide-react";
import { format } from "date-fns";
import TaskHeader from './TaskHeader';
import AssigneesManager from './AssigneesManager';
import TaskLink from './TaskLink';

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
  // Enhanced content rendering with proper list formatting and URL detection
  const renderFormattedContent = (content) => {
    if (!content) return null;

    // Split by lines to handle lists properly
    const lines = content.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Check for numbered lists (1., 2., 3. etc.)
      const numberedListMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numberedListMatch) {
        const [, number, text] = numberedListMatch;
        return (
          <div key={lineIndex} className="flex items-start gap-2 mb-1">
            <span className="flex-shrink-0 text-sm font-medium text-gray-600 dark:text-zinc-400 min-w-6">
              {number}.
            </span>
            <span className="text-sm text-gray-600 dark:text-zinc-400 flex-1">
              {renderLineWithLinks(text)}
            </span>
          </div>
        );
      }

      // Check for bullet points (-, *, •)
      const bulletListMatch = line.match(/^[-*•]\s+(.*)$/);
      if (bulletListMatch) {
        const [, text] = bulletListMatch;
        return (
          <div key={lineIndex} className="flex items-start gap-2 mb-1">
            <span className="flex-shrink-0 text-sm text-gray-600 dark:text-zinc-400 mt-0.5">
              •
            </span>
            <span className="text-sm text-gray-600 dark:text-zinc-400 flex-1">
              {renderLineWithLinks(text)}
            </span>
          </div>
        );
      }

      // Check for nested lists (with indentation)
      const nestedListMatch = line.match(/^\s{2,}[-*•]\s+(.*)$/);
      if (nestedListMatch) {
        const [, text] = nestedListMatch;
        return (
          <div key={lineIndex} className="flex items-start gap-2 mb-1 ml-4">
            <span className="flex-shrink-0 text-sm text-gray-600 dark:text-zinc-400 mt-0.5">
              ◦
            </span>
            <span className="text-sm text-gray-600 dark:text-zinc-400 flex-1">
              {renderLineWithLinks(text)}
            </span>
          </div>
        );
      }

      // Check for nested numbered lists
      const nestedNumberedMatch = line.match(/^\s{2,}(\d+)\.\s+(.*)$/);
      if (nestedNumberedMatch) {
        const [, number, text] = nestedNumberedMatch;
        return (
          <div key={lineIndex} className="flex items-start gap-2 mb-1 ml-4">
            <span className="flex-shrink-0 text-sm font-medium text-gray-600 dark:text-zinc-400 min-w-6">
              {number}.
            </span>
            <span className="text-sm text-gray-600 dark:text-zinc-400 flex-1">
              {renderLineWithLinks(text)}
            </span>
          </div>
        );
      }

      // Regular line with URL detection
      return (
        <div key={lineIndex} className="mb-2 last:mb-0">
          {line.trim() ? renderLineWithLinks(line) : <br />}
        </div>
      );
    });
  };

  // Helper function to render individual lines with URL detection
  const renderLineWithLinks = (text) => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s<>{}\[\]\\^`|()]+[^\s<>{}\[\]\\^`|.,!?;)]\)?)/gi;
    
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mx-1"
          >
            {part.length > 50 ? part.substring(0, 50) + '...' : part}
            <ExternalLinkIcon className="size-3" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Safe task links
  const taskLinks = Array.isArray(task.links) ? task.links : [];

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
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-2">
              Description (supports lists and links)
            </label>
            <textarea
              value={editingTaskData.description || ""}
              onChange={(e) => onTaskDataChange('description', e.target.value)}
              placeholder={`Enter task description...
• Use bullets with - or *
• Use numbers like 1. 2. 3.
• Indent with spaces for nested lists
• URLs will be automatically linked`}
              className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded p-3 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              rows={6}
            />
            <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              <strong>Formatting tips:</strong> Use "- item" for bullets, "1. item" for numbers, indent with 2 spaces for nested lists
            </div>
          </div>
        ) : (
          task.description && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-2">
                Description
              </label>
              <div className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                {renderFormattedContent(task.description)}
              </div>
            </div>
          )
        )}

        {/* Task Links - ENHANCED: Better display */}
        {taskLinks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="size-4 text-gray-500 dark:text-zinc-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                Attached Links ({taskLinks.length})
              </span>
            </div>
            <div className="space-y-2">
              {taskLinks.map((link) => (
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

        <AssigneesManager
          task={task}
          isEditingTask={isEditingTask}
          editingTaskData={editingTaskData}
          isManagingAssignees={isManagingAssignees}
          availableMembers={availableMembers}
          selectedMember={selectedMember}
          canEditTask={canEditTask}
          onManageAssigneesToggle={onManageAssigneesToggle}
          onMemberSelect={onMemberSelect}
          onAddAssignee={onAddAssignee}
          onRemoveAssignee={onRemoveAssignee}
          onTaskDataChange={onTaskDataChange}
        />
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
  );
};

export default TaskInfoPanel;