// components/TaskInfoPanel.js - PROFESSIONAL VERSION
import React from 'react';
import { Save, LinkIcon, PenIcon, ExternalLinkIcon, HelpCircle } from "lucide-react";
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
  const [showFormattingHelp, setShowFormattingHelp] = React.useState(false);

  // Professional content rendering with advanced formatting
  const renderFormattedContent = (content) => {
    if (!content) return null;

    const lines = content.split('\n');
    let inList = false;
    let listDepth = 0;
    let lastWasBlank = false;

    return lines.map((line, lineIndex) => {
      const trimmedLine = line.trim();
      const isBlankLine = !trimmedLine;
      
      // Reset list state on blank lines for better separation
      if (isBlankLine && inList) {
        inList = false;
        listDepth = 0;
        lastWasBlank = true;
        return <div key={lineIndex} className="h-3" />; // Consistent spacing
      }

      lastWasBlank = false;

      // Detect list depth by leading spaces
      const leadingSpaces = line.match(/^(\s*)/)[0].length;
      const currentDepth = Math.floor(leadingSpaces / 2); // 2 spaces per level
      
      // Check for numbered lists (1., 2., 3. etc.)
      const numberedListMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
      if (numberedListMatch) {
        const [, number, text] = numberedListMatch;
        const element = (
          <div 
            key={lineIndex} 
            className={`flex items-start gap-3 mb-2 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-lg px-2 py-1 ${
              currentDepth > 0 ? 'ml-' + (currentDepth * 6) : ''
            }`}
          >
            <span className="flex-shrink-0 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full size-6 flex items-center justify-center mt-0.5">
              {number}
            </span>
            <span className="text-sm text-gray-700 dark:text-zinc-300 flex-1 leading-relaxed">
              {renderLineWithLinks(text)}
            </span>
          </div>
        );
        inList = true;
        listDepth = currentDepth;
        return element;
      }

      // Check for bullet points (-, *, •)
      const bulletListMatch = trimmedLine.match(/^[-*•]\s+(.*)$/);
      if (bulletListMatch) {
        const [, text] = bulletListMatch;
        const bulletColor = currentDepth === 0 ? 'text-blue-500' : 
                           currentDepth === 1 ? 'text-green-500' : 
                           'text-purple-500';
        
        const element = (
          <div 
            key={lineIndex} 
            className={`flex items-start gap-3 mb-2 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-lg px-2 py-1 ${
              currentDepth > 0 ? 'ml-' + (currentDepth * 6) : ''
            }`}
          >
            <span className={`flex-shrink-0 text-lg font-medium mt-0.5 ${bulletColor}`}>
              •
            </span>
            <span className="text-sm text-gray-700 dark:text-zinc-300 flex-1 leading-relaxed">
              {renderLineWithLinks(text)}
            </span>
          </div>
        );
        inList = true;
        listDepth = currentDepth;
        return element;
      }

      // Check for checkboxes [ ] and [x]
      const checkboxMatch = trimmedLine.match(/^\[([ x])\]\s+(.*)$/i);
      if (checkboxMatch) {
        const [, checked, text] = checkboxMatch;
        const isChecked = checked.toLowerCase() === 'x';
        
        const element = (
          <div 
            key={lineIndex} 
            className={`flex items-start gap-3 mb-2 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-lg px-2 py-1 ${
              currentDepth > 0 ? 'ml-' + (currentDepth * 6) : ''
            }`}
          >
            <div className={`flex-shrink-0 size-4 border-2 rounded mt-1 flex items-center justify-center ${
              isChecked 
                ? 'bg-green-500 border-green-500 text-white' 
                : 'border-gray-400 dark:border-zinc-500'
            }`}>
              {isChecked && (
                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-sm flex-1 leading-relaxed ${
              isChecked 
                ? 'text-gray-500 dark:text-zinc-500 line-through' 
                : 'text-gray-700 dark:text-zinc-300'
            }`}>
              {renderLineWithLinks(text)}
            </span>
          </div>
        );
        inList = true;
        listDepth = currentDepth;
        return element;
      }

      // Regular paragraph with proper styling
      if (trimmedLine) {
        const element = (
          <div key={lineIndex} className="mb-3 last:mb-0">
            <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
              {renderLineWithLinks(trimmedLine)}
            </p>
          </div>
        );
        inList = false;
        listDepth = 0;
        return element;
      }

      // Blank line
      return <div key={lineIndex} className="h-3" />;
    });
  };

  // Enhanced URL detection with better styling
  const renderLineWithLinks = (text) => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s<>{}\[\]\\^`|()]+[^\s<>{}\[\]\\^`|.,!?;)]\)?)/gi;
    
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        const domain = part.replace(/^https?:\/\//, '').split('/')[0];
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 transition-all duration-200 text-sm font-medium mx-1"
          >
            <ExternalLinkIcon className="size-3.5" />
            {domain.length > 25 ? domain.substring(0, 25) + '...' : domain}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Formatting help component
  const FormattingHelp = () => (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
        <HelpCircle className="size-4" />
        Formatting Guide
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-700 dark:text-blue-300">
        <div>
          <div className="font-medium mb-1">Lists</div>
          <div>• Bullet points</div>
          <div>1. Numbered lists</div>
          <div className="ml-4">◦ Nested items</div>
        </div>
        <div>
          <div className="font-medium mb-1">Checkboxes</div>
          <div>[ ] Todo item</div>
          <div>[x] Done item</div>
          <div>URLs auto-link</div>
        </div>
      </div>
    </div>
  );

  // Safe task links
  const taskLinks = Array.isArray(task.links) ? task.links : [];

  return (
    <div className="w-full lg:w-1/2 flex flex-col gap-6">
      <div className="p-6 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm">
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300">
                Description
              </label>
              <button
                type="button"
                onClick={() => setShowFormattingHelp(!showFormattingHelp)}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <HelpCircle className="size-3.5" />
                {showFormattingHelp ? 'Hide Help' : 'Formatting Help'}
              </button>
            </div>

            {showFormattingHelp && <FormattingHelp />}

            <textarea
              value={editingTaskData.description || ""}
              onChange={(e) => onTaskDataChange('description', e.target.value)}
              placeholder={`Describe the task in detail...

• Use bullet points for features
1. Use numbers for steps
  • Indent with spaces for sub-items
[x] Use checkboxes for completion
https://links-will-auto-convert.com`}
              className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg p-4 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono leading-relaxed transition-all duration-200"
              rows={8}
            />
          </div>
        ) : (
          task.description && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                Description
              </label>
              <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                {renderFormattedContent(task.description)}
              </div>
            </div>
          )
        )}

        {/* Task Links */}
        {taskLinks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="size-5 text-gray-600 dark:text-zinc-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
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

        {/* Save/Cancel Buttons */}
        {isEditingTask && (
          <div className="flex justify-end gap-3 mb-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
            <button
              onClick={onEditToggle}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onTaskUpdate}
              disabled={taskLoading || !editingTaskData.title?.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            >
              <Save className="size-4" />
              {taskLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        <hr className="border-gray-200 dark:border-zinc-700 my-4" />

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

      {/* Project Details */}
      {project && (
        <div className="p-6 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PenIcon className="size-5 text-gray-600 dark:text-zinc-400" />
            <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Project Details</p>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-3">
            {project.name}
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-zinc-400">Start Date</span>
              <span className="font-medium text-gray-900 dark:text-zinc-100">
                {project.start_date ? format(new Date(project.start_date), "MMM dd, yyyy") : "Not set"}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-zinc-400">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                project.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
              }`}>
                {project.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-zinc-400">Priority</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                project.priority === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                project.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              }`}>
                {project.priority}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-zinc-400">Progress</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="font-medium text-gray-900 dark:text-zinc-100 w-8">
                  {project.progress}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskInfoPanel;