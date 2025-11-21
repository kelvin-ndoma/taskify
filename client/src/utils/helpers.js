// utils/helpers.js
import { ExternalLinkIcon } from "lucide-react";

export const getSafeImageUrl = (imageUrl) => {
  if (!imageUrl || imageUrl.trim() === "" || imageUrl === "null") {
    return null;
  }
  return imageUrl;
};

export const renderContentWithLinks = (content) => {
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