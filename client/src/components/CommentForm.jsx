// components/CommentForm.jsx
import { useState } from "react";
import { PaperclipIcon, PlusIcon, LinkIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";

const CommentForm = ({ 
  onSubmit, 
  loading, 
  taskId 
}) => {
  const [newComment, setNewComment] = useState("");
  const [commentLinks, setCommentLinks] = useState([]);
  const [showCommentLinkInput, setShowCommentLinkInput] = useState(false);
  const [commentLinkUrl, setCommentLinkUrl] = useState("");

  const addCommentLink = () => {
    if (!commentLinkUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    let formattedUrl = commentLinkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      new URL(formattedUrl);
      
      const newLink = {
        url: formattedUrl,
        id: Date.now().toString()
      };

      setCommentLinks(prev => [...prev, newLink]);
      setCommentLinkUrl("");
      setShowCommentLinkInput(false);
      toast.success("Link added to comment!");
    } catch (error) {
      toast.error("Please enter a valid URL");
    }
  };

  const removeCommentLink = (linkId) => {
    setCommentLinks(prev => prev.filter(link => link.id !== linkId));
  };

  const handleSubmit = () => {
    onSubmit(newComment, commentLinks);
    setNewComment("");
    setCommentLinks([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

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
              onClick={() => setShowCommentLinkInput(!showCommentLinkInput)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
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
                onChange={(e) => setCommentLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 rounded dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCommentLink())}
              />
              <button
                type="button"
                onClick={addCommentLink}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1"
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
                      onClick={() => removeCommentLink(link.id)}
                      className="text-red-500 hover:text-red-700"
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
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Write a comment... (Ctrl+Enter to send)"
          className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md p-3 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          disabled={loading}
        />
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
          Press Ctrl+Enter to send
        </p>
      </div>
      <button
        onClick={handleSubmit}
        disabled={(!newComment.trim() && commentLinks.length === 0) || loading}
        className="bg-gradient-to-l from-blue-500 to-blue-600 transition-colors text-white text-sm px-6 py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Posting..." : "Post"}
      </button>
    </div>
  );
};

export default CommentForm;