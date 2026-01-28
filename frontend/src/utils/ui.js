/**
 * UI Utilities
 * Reusable UI components and helpers
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toasts
  const existing = document.querySelectorAll('.toast');
  existing.forEach(toast => toast.remove());
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast--show');
  });
  
  // Auto-remove
  setTimeout(() => {
    toast.classList.remove('toast--show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Show inline field error
 * @param {HTMLElement} field - Input field element
 * @param {string} message - Error message
 */
export function showFieldError(field, message) {
  if (!field) return;
  
  // Remove existing error
  clearFieldError(field);
  
  // Add error class to field
  field.classList.add('input--error');
  
  // Create error message element
  const error = document.createElement('div');
  error.className = 'field-error';
  error.textContent = message;
  error.dataset.errorFor = field.id || field.name;
  
  // Insert after field
  field.parentNode.insertBefore(error, field.nextSibling);
}

/**
 * Clear inline field error
 * @param {HTMLElement} field - Input field element
 */
export function clearFieldError(field) {
  if (!field) return;
  
  field.classList.remove('input--error');
  
  // Remove error message
  const errorId = field.id || field.name;
  const error = field.parentNode.querySelector(`.field-error[data-error-for="${errorId}"]`);
  if (error) {
    error.remove();
  }
}

/**
 * Clear all field errors in a form
 * @param {HTMLElement} form - Form element
 */
export function clearAllFieldErrors(form) {
  if (!form) return;
  
  const fields = form.querySelectorAll('.input--error');
  fields.forEach(field => clearFieldError(field));
  
  const errors = form.querySelectorAll('.field-error');
  errors.forEach(error => error.remove());
}

/**
 * Show field errors from API response
 * @param {HTMLElement} form - Form element
 * @param {object} fieldErrors - Field errors object { fieldName: errorMessage }
 */
export function showFieldErrors(form, fieldErrors) {
  if (!form || !fieldErrors) return;
  
  Object.entries(fieldErrors).forEach(([fieldName, message]) => {
    const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
    if (field) {
      showFieldError(field, message);
    }
  });
}

/**
 * Set button loading state
 * @param {HTMLElement} button - Button element
 * @param {boolean} loading - Loading state
 * @param {string} loadingText - Text to show while loading (optional)
 */
export function setButtonLoading(button, loading, loadingText = 'Lädt...') {
  if (!button) return;
  
  if (loading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.classList.add('btn--loading');
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
    button.classList.remove('btn--loading');
    delete button.dataset.originalText;
  }
}

/**
 * Set form loading state (disable all inputs and buttons)
 * @param {HTMLElement} form - Form element
 * @param {boolean} loading - Loading state
 */
export function setFormLoading(form, loading) {
  if (!form) return;
  
  const inputs = form.querySelectorAll('input, select, textarea, button');
  inputs.forEach(input => {
    input.disabled = loading;
  });
  
  if (loading) {
    form.classList.add('form--loading');
  } else {
    form.classList.remove('form--loading');
  }
}

/**
 * Show loading spinner in container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message (optional)
 */
export function showLoading(container, message = 'Lädt...') {
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Show empty state in container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Empty state message
 * @param {string} actionText - Action button text (optional)
 * @param {Function} actionHandler - Action button handler (optional)
 */
export function showEmptyState(container, message, actionText = null, actionHandler = null) {
  if (!container) return;
  
  let html = `
    <div class="empty-state">
      <p>${message}</p>
  `;
  
  if (actionText && actionHandler) {
    const actionId = `empty-action-${Date.now()}`;
    html += `<button class="btn btn--primary" id="${actionId}">${actionText}</button>`;
  }
  
  html += `</div>`;
  
  container.innerHTML = html;
  
  if (actionText && actionHandler) {
    const actionId = `empty-action-${Date.now() - 1}`;
    const btn = container.querySelector(`#${actionId}`);
    if (btn) {
      btn.addEventListener('click', actionHandler);
    }
  }
}

/**
 * Show error state in container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 * @param {Function} retryHandler - Retry button handler (optional)
 */
export function showErrorState(container, message, retryHandler = null) {
  if (!container) return;
  
  let html = `
    <div class="error-state">
      <p class="error-message">${message}</p>
  `;
  
  if (retryHandler) {
    const retryId = `error-retry-${Date.now()}`;
    html += `<button class="btn btn--secondary" id="${retryId}">Erneut versuchen</button>`;
  }
  
  html += `</div>`;
  
  container.innerHTML = html;
  
  if (retryHandler) {
    const retryId = `error-retry-${Date.now() - 1}`;
    const btn = container.querySelector(`#${retryId}`);
    if (btn) {
      btn.addEventListener('click', retryHandler);
    }
  }
}

/**
 * Confirm dialog
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Confirm button text (default 'OK')
 * @param {string} cancelText - Cancel button text (default 'Abbrechen')
 * @returns {Promise<boolean>} True if confirmed
 */
export function confirm(message, confirmText = 'OK', cancelText = 'Abbrechen') {
  return new Promise((resolve) => {
    // Use native confirm for now (can be replaced with custom modal later)
    const result = window.confirm(message);
    resolve(result);
  });
}

/**
 * Handle API error and show appropriate UI feedback
 * @param {Error} error - Error object from API
 * @param {HTMLElement} form - Form element (optional, for field errors)
 */
export function handleApiError(error, form = null) {
  console.error('API Error:', error);
  
  // Show field errors if available
  if (form && error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
    showFieldErrors(form, error.fieldErrors);
  }
  
  // Show toast with user-friendly message
  const message = error.userMessage || error.message || 'Ein Fehler ist aufgetreten';
  showToast(message, 'error', 5000);
}

