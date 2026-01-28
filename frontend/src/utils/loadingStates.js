/**
 * Loading States Utilities
 * Standardized loading and error state management
 */

/**
 * Show loading state for an element
 * @param {HTMLElement} element - Element to show loading state on
 * @param {string} text - Loading text (optional)
 */
export function showLoading(element, text = 'Lädt...') {
  if (!element) return;
  
  element.classList.add('loading');
  element.disabled = true;
  
  const originalText = element.textContent || element.innerHTML;
  element.setAttribute('data-original-content', originalText);
  
  if (element.tagName === 'BUTTON' || element.tagName === 'INPUT') {
    element.textContent = text;
  } else {
    element.innerHTML = `<span class="loading-spinner">⏳</span> ${text}`;
  }
}

/**
 * Hide loading state for an element
 * @param {HTMLElement} element - Element to hide loading state on
 */
export function hideLoading(element) {
  if (!element) return;
  
  element.classList.remove('loading');
  element.disabled = false;
  
  const originalContent = element.getAttribute('data-original-content');
  if (originalContent) {
    if (element.tagName === 'BUTTON' || element.tagName === 'INPUT') {
      element.textContent = originalContent;
    } else {
      element.innerHTML = originalContent;
    }
    element.removeAttribute('data-original-content');
  }
}

/**
 * Show error state for a container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 * @param {boolean} showRetry - Show retry button
 * @param {function} retryCallback - Retry callback function
 */
export function showError(container, message, showRetry = false, retryCallback = null) {
  if (!container) return;
  
  container.innerHTML = `
    <div class="error-state">
      <div class="error-state__icon">⚠️</div>
      <div class="error-state__title">Fehler</div>
      <div class="error-state__message">${message}</div>
      ${showRetry && retryCallback ? `
        <button class="btn btn--primary" data-action="retry-load">Erneut versuchen</button>
      ` : ''}
    </div>
  `;
  
  if (showRetry && retryCallback) {
    const retryBtn = container.querySelector('[data-action="retry-load"]');
    if (retryBtn) {
      retryBtn.addEventListener('click', retryCallback);
    }
  }
}

/**
 * Show empty state for a container
 * @param {HTMLElement} container - Container element
 * @param {string} title - Empty state title
 * @param {string} message - Empty state message
 * @param {string} actionLabel - Action button label (optional)
 * @param {function} actionCallback - Action callback function (optional)
 */
export function showEmpty(container, title, message, actionLabel = null, actionCallback = null) {
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">📭</div>
      <div class="empty-state__title">${title}</div>
      <div class="empty-state__message">${message}</div>
      ${actionLabel && actionCallback ? `
        <button class="btn btn--primary" data-action="empty-action">${actionLabel}</button>
      ` : ''}
    </div>
  `;
  
  if (actionLabel && actionCallback) {
    const actionBtn = container.querySelector('[data-action="empty-action"]');
    if (actionBtn) {
      actionBtn.addEventListener('click', actionCallback);
    }
  }
}

/**
 * Show loading state for a container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message
 */
export function showLoadingState(container, message = 'Lädt...') {
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner">⏳</div>
      <div class="loading-state__message">${message}</div>
    </div>
  `;
}


