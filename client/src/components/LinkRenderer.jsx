// components/LinkRenderer.jsx
import { ExternalLink } from "lucide-react";

const LinkRenderer = ({ text, className = "" }) => {
  if (!text) return null;

  // Enhanced URL regex that catches more URL patterns
  const urlRegex = /(https?:\/\/[^\s<>(){}|\\^~\[\]`"']+[^\s<>(){}|\\^~\[\]`"'.!?])/g;
  
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }
    
    // Add the URL as a clickable link
    const url = match[0];
    elements.push(
      <a 
        key={`link-${match.index}`}
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 underline inline-flex items-center gap-1 mx-0.5 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
        <ExternalLink className="size-3 flex-shrink-0" />
      </a>
    );
    
    lastIndex = urlRegex.lastIndex;
  }
  
  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    elements.push(
      <span key={`text-${lastIndex}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }
  
  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      {elements.length > 0 ? elements : text}
    </div>
  );
};

export default LinkRenderer;