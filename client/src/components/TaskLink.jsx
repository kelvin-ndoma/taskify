// components/TaskLink.js - UPDATED VERSION
import React from 'react';
import { LinkIcon, ExternalLinkIcon } from "lucide-react";

const TaskLink = ({ link }) => {
  const getDomainFromUrl = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain.length > 30 ? domain.substring(0, 30) + '...' : domain;
    } catch {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  };

  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const faviconUrl = getFaviconUrl(link.url);
  const domain = getDomainFromUrl(link.url);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group"
    >
      <div className="flex-shrink-0">
        {faviconUrl ? (
          <img 
            src={faviconUrl} 
            alt="" 
            className="size-6 rounded"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : null}
        <div className={`size-6 bg-blue-500 rounded flex items-center justify-center ${faviconUrl ? 'hidden' : 'flex'}`}>
          <LinkIcon className="size-3 text-white" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {link.title || domain}
          </h4>
          <ExternalLinkIcon className="size-3 text-gray-400 flex-shrink-0 mt-1" />
        </div>
        
        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1 truncate">
          {link.url}
        </p>
      </div>
    </a>
  );
};

export default TaskLink;