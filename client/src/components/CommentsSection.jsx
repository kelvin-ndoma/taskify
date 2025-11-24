// components/CommentsSection.js - OPTIMIZED VERSION
import React, { memo, useMemo } from 'react';
import { MessageCircle, AlertCircle, RefreshCw } from "lucide-react";
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';

// Memoize the CommentsSection to prevent unnecessary re-renders
const CommentsSection = memo(({
  comments: rawComments,
  user,
  newComment,
  commentLinks,
  showCommentLinkInput,
  commentLinkUrl,
  commentLoading,
  commentsLoading = false,
  editingCommentId,
  editingCommentContent,
  onCommentChange,
  onKeyPress,
  onAddComment,
  onStartEditComment,
  onCancelEditComment,
  onUpdateComment,
  onDeleteComment,
  onEditingCommentContentChange,
  onAddLinkClick,
  onLinkUrlChange,
  onAddCommentLink,
  onRemoveCommentLink,
  onRefreshComments, // NEW: Manual refresh function
  lastUpdate // NEW: Track when comments were last updated
}) => {
  
  // Optimized comments normalization with useMemo
  const comments = useMemo(() => 
    Array.isArray(rawComments) 
      ? rawComments.map(comment => ({
          ...comment,
          links: Array.isArray(comment.links) ? comment.links : [],
          user: comment.user || { id: 'unknown', name: 'Unknown User' }
        }))
      : [],
    [rawComments] // Only recalculate when rawComments changes
  );

  // Memoize comment items to prevent re-renders
  const commentItems = useMemo(() => 
    comments.map((comment) => (
      <MemoizedCommentItem
        key={comment.id}
        comment={comment}
        user={user}
        editingCommentId={editingCommentId}
        editingCommentContent={editingCommentContent}
        onStartEdit={onStartEditComment}
        onCancelEdit={onCancelEditComment}
        onUpdateComment={onUpdateComment}
        onDeleteComment={onDeleteComment}
        onContentChange={onEditingCommentContentChange}
      />
    )),
    [comments, user, editingCommentId, editingCommentContent]
  );

  const [debugMode, setDebugMode] = React.useState(false);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);

  // Manual refresh with visual feedback
  const handleManualRefresh = async () => {
    if (manualRefreshing) return;
    
    setManualRefreshing(true);
    if (onRefreshComments) {
      await onRefreshComments(false); // Non-silent refresh
    }
    // Reset refreshing state after a minimum time for better UX
    setTimeout(() => setManualRefreshing(false), 1000);
  };

  // Format last update time for display
  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    
    const now = new Date();
    const diffMs = now - new Date(lastUpdate);
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  if (commentsLoading) {
    return (
      <div className="w-full lg:w-2/3">
        <div className="p-5 rounded-md border border-gray-300 dark:border-zinc-800 flex flex-col lg:h-[80vh]">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
            <MessageCircle className="size-5" /> 
            Task Discussion (Loading...)
          </h2>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-zinc-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm">Loading comments...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-2/3">
      <div className="p-5 rounded-md border border-gray-300 dark:border-zinc-800 flex flex-col lg:h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <MessageCircle className="size-5" /> 
              Task Discussion ({comments.length})
            </h2>
            
            {/* Last update indicator */}
            {lastUpdate && (
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                Updated {formatLastUpdate()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Manual refresh button */}
            <button
              onClick={handleManualRefresh}
              disabled={manualRefreshing}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 disabled:opacity-50 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700"
              title="Refresh comments"
            >
              <RefreshCw className={`size-3.5 ${manualRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Debug toggle - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => setDebugMode(!debugMode)}
                className="text-xs bg-gray-200 dark:bg-zinc-700 px-2 py-1 rounded"
              >
                {debugMode ? '❌ Debug' : '🐛 Debug'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 md:overflow-y-scroll no-scrollbar pr-2">
          {comments.length > 0 ? (
            <div className="flex flex-col gap-4 mb-6">
              {commentItems}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-zinc-500">
              <MessageCircle className="size-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs mt-1">Be the first to start the discussion!</p>
            </div>
          )}
        </div>

        <CommentForm
          newComment={newComment}
          onCommentChange={onCommentChange}
          onKeyPress={onKeyPress}
          onAddComment={onAddComment}
          commentLinks={commentLinks}
          showCommentLinkInput={showCommentLinkInput}
          commentLinkUrl={commentLinkUrl}
          onAddLinkClick={onAddLinkClick}
          onLinkUrlChange={onLinkUrlChange}
          onAddCommentLink={onAddCommentLink}
          onRemoveCommentLink={onRemoveCommentLink}
          commentLoading={commentLoading}
        />
      </div>
    </div>
  );
});

// Memoized CommentItem to prevent unnecessary re-renders
const MemoizedCommentItem = memo(CommentItem);

// Add display name for better dev tools
CommentsSection.displayName = 'CommentsSection';

export default CommentsSection;