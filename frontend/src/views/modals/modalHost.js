/**
 * Generic modal host system
 * Provides standardized modal open/close functionality
 */

const activeModals = new Map(); // Map<id, {container, onMount, onUnmount}>

// Get modal root (lazy initialization)
function getModalRoot() {
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  return root;
}

/**
 * Open modal
 * @param {string} id - Modal ID
 * @param {string} html - Modal HTML
 * @param {object} options - Options { onMount, onUnmount }
 */
export function openModal(id, html, options = {}) {
  const { onMount, onUnmount } = options;
  
  // Close existing modal with same ID if exists
  if (activeModals.has(id)) {
    closeModal(id);
  }
  
  // Create modal container
  const container = document.createElement('div');
  container.id = `modal-${id}`;
  container.className = 'modal-host-container';
  container.innerHTML = html;
  
  // Store modal info
  activeModals.set(id, {
    container,
    onMount,
    onUnmount
  });
  
  // Append to root
  getModalRoot().appendChild(container);
  
  // Call onMount if provided
  if (onMount) {
    try {
      onMount(container);
    } catch (error) {
      console.error(`Error in modal onMount for ${id}:`, error);
    }
  }
  
  return container;
}

/**
 * Close modal
 * @param {string} id - Modal ID
 */
export function closeModal(id) {
  const modalInfo = activeModals.get(id);
  if (!modalInfo) return;
  
  const { container, onUnmount } = modalInfo;
  
  // Call onUnmount if provided
  if (onUnmount) {
    try {
      onUnmount(container);
    } catch (error) {
      console.error(`Error in modal onUnmount for ${id}:`, error);
    }
  }
  
  // Remove from DOM
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
  
  // Remove from map
  activeModals.delete(id);
}

/**
 * Check if modal is open
 * @param {string} id - Modal ID
 * @returns {boolean} True if modal is open
 */
export function isModalOpen(id) {
  return activeModals.has(id);
}

/**
 * Get modal container
 * @param {string} id - Modal ID
 * @returns {Element|null} Modal container element
 */
export function getModalContainer(id) {
  const modalInfo = activeModals.get(id);
  return modalInfo ? modalInfo.container : null;
}

/**
 * Close all modals
 */
export function closeAllModals() {
  for (const id of activeModals.keys()) {
    closeModal(id);
  }
}

