// components/CommentsSection.js - UPDATED VERSION
import React from 'react';
import { MessageCircle, AlertCircle } from "lucide-react";
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';

const CommentsSection = ({
  comments: rawComments,
  user,
  newComment,
  commentLinks,
  showCommentLinkInput,
  commentLinkUrl,
  commentLoading,
  commentsLoading = false, // NEW: Add loading prop
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
  onRemoveCommentLink
}) => {
  
  // Safe comments normalization
  const comments = Array.isArray(rawComments) 
    ? rawComments.map(comment => ({
        ...comment,
        links: Array.isArray(comment.links) ? comment.links : [],
        user: comment.user || { id: 'unknown', name: 'Unknown User' }
      }))
    : [];

  // Debug mode - can be enabled/disabled
  const [debugMode, setDebugMode] = React.useState(false);

  // Debug: Log comments to see if links are present
  React.useEffect(() => {
    if (debugMode) {
      console.log("=== COMMENTS DEBUG MODE ===");
      console.log("Total comments:", comments.length);
      comments.forEach((comment, index) => {
        console.log(`Comment ${index}:`, {
          id: comment.id,
          content: comment.content?.substring(0, 50) + '...',
          linksCount: comment.links.length,
          links: comment.links,
          hasUser: !!comment.user,
          userId: comment.user?.id
        });
      });
      console.log("=== END DEBUG ===");
    }
  }, [comments, debugMode]);

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
          <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
            <MessageCircle className="size-5" /> 
            Task Discussion ({comments.length})
          </h2>
          
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

        <div className="flex-1 md:overflow-y-scroll no-scrollbar pr-2">
          {comments.length > 0 ? (
            <div className="flex flex-col gap-4 mb-6">
              {comments.map((comment) => (
                <CommentItem
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
              ))}
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
};

export default CommentsSection;