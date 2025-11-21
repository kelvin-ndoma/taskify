// components/CommentItem.js
import React from 'react';
import { format } from "date-fns";
import { Edit3, Trash2, Save, X, ExternalLinkIcon, LinkIcon } from "lucide-react";
import UserAvatar from './UserAvatar';

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

  // Safe link access with fallback
  const commentLinks = comment.links || [];

  // Function to extract domain from URL
  const getDomainFromUrl = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  // Function to get favicon
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  // Enhanced content rendering with better link detection
  const renderContentWithLinks = (content) => {
    if (!content) return null;

    // Improved URL regex to catch more URL patterns
    const urlRegex = /(https?:\/\/[^\s<>(){}|\\^`[\]]+)/gi;
    
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      // Check if this part is a URL
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mx-1"
          >
            {part}
            <ExternalLinkIcon className="size-3" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      className={`sm:max-w-4/5 dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-900 border border-gray-300 dark:border-zinc-700 p-4 rounded-lg ${
        comment.user.id === user?.id ? "ml-auto bg-blue-50 dark:bg-blue-900/20" : "mr-auto bg-white dark:bg-zinc-800"
      }`}
    >
      {/* User Info and Actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <UserAvatar user={comment.user} size={6} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {comment.user.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                {format(new Date(comment.createdAt), "dd MMM yyyy, HH:mm")}
              </span>
            </div>
          </div>
        </div>
        
        {/* Comment Actions */}
        {canEditComment && (
          <div className="flex items-center gap-1">
            {editingCommentId === comment.id ? (
              <>
                <button
                  onClick={() => onUpdateComment(comment.id)}
                  className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                  title="Save"
                >
                  <Save className="size-3.5" />
                </button>
                <button
                  onClick={onCancelEdit}
                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  title="Cancel"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onStartEdit(comment)}
                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                  title="Edit"
                >
                  <Edit3 className="size-3.5" />
                </button>
                <button
                  onClick={() => onDeleteComment(comment.id)}
                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Comment Content */}
      {editingCommentId === comment.id ? (
        <textarea
          value={editingCommentContent}
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded p-3 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          rows={3}
          autoFocus
        />
      ) : (
        <div className="text-sm text-gray-900 dark:text-zinc-200 mb-3 leading-relaxed">
          {renderContentWithLinks(comment.content)}
        </div>
      )}

      {/* Attached Links Section */}
      {commentLinks.length > 0 && (
        <div className="mt-3 border-t border-gray-200 dark:border-zinc-600 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="size-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">
              Attached Links ({commentLinks.length})
            </span>
          </div>
          <div className="space-y-2">
            {commentLinks.map((link) => {
              const faviconUrl = getFaviconUrl(link.url);
              const domain = getDomainFromUrl(link.url);
              
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors group"
                >
                  <div className="flex-shrink-0">
                    {faviconUrl ? (
                      <img 
                        src={faviconUrl} 
                        alt="" 
                        className="size-5 rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`size-5 bg-blue-500 rounded flex items-center justify-center ${faviconUrl ? 'hidden' : 'flex'}`}>
                      <LinkIcon className="size-3 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {domain}
                      </h4>
                      <ExternalLinkIcon className="size-3 text-gray-400 flex-shrink-0" />
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 truncate">
                      {link.url}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentItem;