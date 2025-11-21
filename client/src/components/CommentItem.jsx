// components/CommentItem.js
import React from 'react';
import { format } from "date-fns";
import { Edit3, Trash2, Save, X, ExternalLinkIcon } from "lucide-react";
import UserAvatar from './UserAvatar';
import CommentLink from './CommentLink';

const CommentItem = ({ 
  comment, 
  user, 
  editingCommentId, 
  editingCommentContent, 
  onStartEdit, 
  onCancelEdit, 
  onUpdateComment, 
  onDeleteComment,
  onContentChange 
}) => {
  const canEditComment = comment.user.id === user?.id;

  // Safe link access
  const commentLinks = comment.links || [];

  const renderContentWithLinks = (content) => {
    if (!content) return null;

    const urlRegex = /(https?:\/\/[^\s<>{}\[\]\\^`|()]+[^\s<>{}\[\]\\^`|.,!?;)]\)?)/gi;
    
    const parts = content.split(urlRegex);
    const matches = content.match(urlRegex) || [];

    return parts.map((part, index) => {
      if (matches.includes(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            {part}
            <ExternalLinkIcon className="size-3" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`sm:max-w-4/5 dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-900 border border-gray-300 dark:border-zinc-700 p-3 rounded-md ${
        comment.user.id === user?.id ? "ml-auto bg-blue-50 dark:bg-blue-900/20" : "mr-auto"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
          <UserAvatar user={comment.user} size={5} />
          <span className="font-medium text-gray-900 dark:text-white">{comment.user.name}</span>
          <span className="text-xs text-gray-400 dark:text-zinc-600">
            • {format(new Date(comment.createdAt), "dd MMM yyyy, HH:mm")}
          </span>
        </div>
        
        {/* Comment Actions */}
        {canEditComment && (
          <div className="flex items-center gap-1">
            {editingCommentId === comment.id ? (
              <>
                <button
                  onClick={() => onUpdateComment(comment.id)}
                  className="p-1 text-green-600 hover:text-green-800"
                  title="Save"
                >
                  <Save className="size-3" />
                </button>
                <button
                  onClick={onCancelEdit}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Cancel"
                >
                  <X className="size-3" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onStartEdit(comment)}
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Edit3 className="size-3" />
                </button>
                <button
                  onClick={() => onDeleteComment(comment.id)}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="size-3" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Editable Comment Content */}
      {editingCommentId === comment.id ? (
        <textarea
          value={editingCommentContent}
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded p-2 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          autoFocus
        />
      ) : (
        <div className="text-sm text-gray-900 dark:text-zinc-200">
          {renderContentWithLinks(comment.content)}
        </div>
      )}

      {/* Comment Links - FIXED: Safe rendering */}
      {commentLinks.length > 0 && (
        <div className="mt-3 space-y-2">
          {commentLinks.map((link) => (
            <CommentLink key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;