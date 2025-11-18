// utils/linkUtils.js
/**
 * Process content and extract link information
 */
export async function processContentForLinks(content) {
  if (!content) {
    return {
      containsLinks: false,
      links: []
    };
  }

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const links = content.match(urlRegex) || [];
  const containsLinks = links.length > 0;

  return {
    containsLinks,
    links: containsLinks ? links : []
  };
}

/**
 * Extract links from text content
 */
export function extractLinks(content) {
  if (!content) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.match(urlRegex) || [];
}

/**
 * Validate URL format
 */
export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}