// components/CommentsSection.js
import React from 'react';
import { MessageCircle } from "lucide-react";
import CommentItem from './CommentItem';
import CommentForm from '../components/CommentForm';

const CommentsSection = ({
  comments,
  user,
  newComment,
  commentLinks,
  showCommentLinkInput,
  commentLinkUrl,
  commentLoading,
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
  return (
    <div className="w-full lg:w-2/3">
      <div className="p-5 rounded-md border border-gray-300 dark:border-zinc-800 flex flex-col lg:h-[80vh]">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
          <MessageCircle className="size-5" /> Task Discussion ({comments.length})
        </h2>

        <div className="flex-1 md:overflow-y-scroll no-scrollbar">
          {comments.length > 0 ? (
            <div className="flex flex-col gap-4 mb-6 mr-2">
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
          commentLinks={commentLinks}
          showCommentLinkInput={showCommentLinkInput}
          commentLinkUrl={commentLinkUrl}
          commentLoading={commentLoading}
          onCommentChange={onCommentChange}
          onKeyPress={onKeyPress}
          onAddComment={onAddComment}
          onAddLinkClick={onAddLinkClick}
          onLinkUrlChange={onLinkUrlChange}
          onAddCommentLink={onAddCommentLink}
          onRemoveCommentLink={onRemoveCommentLink}
        />
      </div>
    </div>
  );
};

export default CommentsSection;