// components/CommentForm.jsx - ALTERNATIVE ROBUST VERSION
import { PaperclipIcon, PlusIcon, LinkIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { memo, useState, useCallback } from "react";

const CommentForm = memo(({ 
  newComment,
  onCommentChange,
  onKeyPress,
  onAddComment,
  commentLinks,
  showCommentLinkInput,
  commentLinkUrl,
  onAddLinkClick,
  onLinkUrlChange,
  onAddCommentLink,
  onRemoveCommentLink,
  commentLoading
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Robust form submission handler
  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent multiple simultaneous submissions
    if (isSubmitting || commentLoading) {
      console.log("⏳ Already submitting, skipping...");
      return;
    }

    if (!newComment.trim() && commentLinks.length === 0) {
      toast.error("Comment cannot be empty");
      return;
    }

    if (typeof onAddComment !== 'function') {
      console.error('onAddComment is not a function');
      toast.error('Cannot submit comment - form error');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("🔄 Comment form submission started...");
      await onAddComment();
      console.log("✅ Comment form submission completed");
    } catch (error) {
      console.error("❌ Comment form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, commentLoading, newComment, commentLinks, onAddComment]);

  // Robust key handler
  const handleKeyDown = useCallback((e) => {
    // Only handle Ctrl+Enter or Cmd+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      console.log("🚀 Keyboard shortcut triggered");
      handleSubmit();
    }
    
    // Pass other key events to parent
    if (typeof onKeyPress === 'function') {
      onKeyPress(e);
    }
  }, [handleSubmit, onKeyPress]);

  // Robust link addition
  const handleAddLink = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (typeof onAddCommentLink === 'function') {
      onAddCommentLink();
    }
  }, [onAddCommentLink]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
      <div className="flex-1 w-full">
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <PaperclipIcon className="size-4" />
              Attach Links to Comment
            </label>
            <button
              type="button"
              onClick={onAddLinkClick}
              disabled={isSubmitting}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
            >
              <PlusIcon className="size-3" />
              {showCommentLinkInput ? "Cancel" : "Add Link"}
            </button>
          </div>

          {showCommentLinkInput && (
            <div className="flex gap-2 p-3 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
              <input
                type="url"
                value={commentLinkUrl}
                onChange={onLinkUrlChange}
                placeholder="https://example.com"
                disabled={isSubmitting}
                className="flex-1 rounded dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
              />
              <button
                type="button"
                onClick={handleAddLink}
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <PlusIcon className="size-3" />
                Add
              </button>
            </div>
          )}

          {commentLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {commentLinks.length} link(s) attached to this comment
              </p>
              <div className="space-y-2 max-h-20 overflow-y-auto">
                {commentLinks.map((link) => (
                  <div key={link.id} className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-500/10 p-2 rounded">
                    <LinkIcon className="size-3 text-blue-500 flex-shrink-0" />
                    <span className="truncate flex-1">{link.url}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveCommentLink(link.id)}
                      disabled={isSubmitting}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <textarea
          value={newComment}
          onChange={onCommentChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... (Ctrl+Enter to send)"
          className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md p-3 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          rows={3}
          disabled={isSubmitting || commentLoading}
        />
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
          Press Ctrl+Enter to send
        </p>
      </div>
      
      <button
        type="button" // Using type="button" to avoid form submission issues
        onClick={handleSubmit}
        disabled={(!newComment.trim() && commentLinks.length === 0) || isSubmitting || commentLoading}
        className="bg-gradient-to-l from-blue-500 to-blue-600 transition-colors text-white text-sm px-6 py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700"
      >
        {isSubmitting || commentLoading ? "Posting..." : "Post"}
      </button>
    </div>
  );
});

CommentForm.displayName = 'CommentForm';

export default CommentForm;