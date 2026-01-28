/**
 * Sanitization Utilities
 * XSS Protection for HTML rendering
 */

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Escape HTML attribute value
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitize ID for use in data attributes
 * @param {string} id - ID to sanitize
 * @returns {string} Sanitized ID
 */
export function sanitizeId(id) {
  if (id === null || id === undefined) return '';
  
  return String(id).replace(/['"<>]/g, '');
}

