/**
 * Drawer Host System
 * Provides side-sliding panels for create/edit forms
 * Similar to modal but slides in from right
 */

const activeDrawers = new Map(); // Map<id, {container, onMount, onUnmount}>

// Get drawer root (lazy initialization)
function getDrawerRoot() {
  let root = document.getElementById('drawer-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'drawer-root';
    document.body.appendChild(root);
  }
  return root;
}

/**
 * Open drawer
 * @param {string} id - Drawer ID
 * @param {string} html - Drawer HTML
 * @param {object} options - Options { onMount, onUnmount, width }
 */
export function openDrawer(id, html, options = {}) {
  const { onMount, onUnmount, width = '480px' } = options;
  
  // Close existing drawer with same ID if exists
  if (activeDrawers.has(id)) {
    closeDrawer(id);
  }
  
  // Create drawer backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  backdrop.setAttribute('data-drawer-id', id);
  
  // Create drawer container
  const container = document.createElement('div');
  container.id = `drawer-${id}`;
  container.className = 'drawer-container';
  container.style.width = width;
  container.setAttribute('data-drawer-id', id);
  container.innerHTML = html;
  
  // Store drawer info
  activeDrawers.set(id, {
    container,
    backdrop,
    onMount,
    onUnmount
  });
  
  // Append to root
  const root = getDrawerRoot();
  root.appendChild(backdrop);
  root.appendChild(container);
  
  // Trigger animation
  requestAnimationFrame(() => {
    backdrop.classList.add('drawer-backdrop--open');
    container.classList.add('drawer-container--open');
  });
  
  // Backdrop click closes drawer
  backdrop.addEventListener('click', () => closeDrawer(id));
  
  // Call onMount if provided
  if (onMount) {
    setTimeout(() => {
      try {
        onMount(container);
      } catch (error) {
        console.error(`Error in drawer onMount for ${id}:`, error);
      }
    }, 50);
  }
  
  return container;
}

/**
 * Close drawer
 * @param {string} id - Drawer ID
 */
export function closeDrawer(id) {
  const drawerInfo = activeDrawers.get(id);
  if (!drawerInfo) return;
  
  const { container, backdrop, onUnmount } = drawerInfo;
  
  // Trigger close animation
  if (backdrop) backdrop.classList.remove('drawer-backdrop--open');
  if (container) container.classList.remove('drawer-container--open');
  
  // Wait for animation, then remove
  setTimeout(() => {
    // Call onUnmount if provided
    if (onUnmount) {
      try {
        onUnmount(container);
      } catch (error) {
        console.error(`Error in drawer onUnmount for ${id}:`, error);
      }
    }
    
    // Remove from DOM
    if (backdrop && backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Remove from map
    activeDrawers.delete(id);
  }, 250); // Match CSS transition duration
}

/**
 * Check if drawer is open
 * @param {string} id - Drawer ID
 * @returns {boolean} True if drawer is open
 */
export function isDrawerOpen(id) {
  return activeDrawers.has(id);
}

/**
 * Close all drawers
 */
export function closeAllDrawers() {
  for (const id of activeDrawers.keys()) {
    closeDrawer(id);
  }
}

