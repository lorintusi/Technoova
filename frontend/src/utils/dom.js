/**
 * DOM utilities and helpers
 */

/**
 * Query selector helper
 * @param {string} selector - CSS selector
 * @param {Element} root - Root element (default: document)
 * @returns {Element|null}
 */
export function $(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Query selector all helper
 * @param {string} selector - CSS selector
 * @param {Element} root - Root element (default: document)
 * @returns {NodeList}
 */
export function $$(selector, root = document) {
  return root.querySelectorAll(selector);
}

/**
 * Bind event listener once (prevents duplicates)
 * @param {Element} element - Element to bind to
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {object} options - Event options
 */
export function bindOnce(element, event, handler, options = {}) {
  if (!element) return;
  
  // Check if already bound
  const key = `__bound_${event}`;
  if (element[key]) {
    element.removeEventListener(event, element[key], options);
  }
  
  element[key] = handler;
  element.addEventListener(event, handler, options);
}

/**
 * Clone and replace element (removes old event listeners)
 * @param {Element} element - Element to clone
 * @param {Function|null} handler - Optional click handler
 * @returns {Element|null} New element
 */
export function cloneAndReplaceElement(element, handler) {
  if (!element) return null;
  const newElement = element.cloneNode(true);
  if (element.parentNode) {
    element.parentNode.replaceChild(newElement, element);
  }
  if (handler) {
    newElement.addEventListener('click', handler);
  }
  return newElement;
}

/**
 * Check if element matches selector (closest match)
 * @param {Element} element - Element to check
 * @param {string} selector - CSS selector
 * @returns {Element|null} Matching element or null
 */
export function matchClosest(element, selector) {
  if (!element || !selector) return null;
  
  // Check element itself
  if (element.matches && element.matches(selector)) {
    return element;
  }
  
  // Check parent
  if (element.closest) {
    return element.closest(selector);
  }
  
  // Fallback: manual traversal
  let current = element.parentElement;
  while (current) {
    if (current.matches && current.matches(selector)) {
      return current;
    }
    current = current.parentElement;
  }
  
  return null;
}

/**
 * Get current date as YYYY-MM-DD string
 * @returns {string} Current date
 */
export function getCurrentDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

