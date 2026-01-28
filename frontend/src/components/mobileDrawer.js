/**
 * Mobile Drawer Component
 * Handles sidebar visibility on mobile devices
 */

let isDrawerOpen = false;
let bodyScrollPosition = 0;

/**
 * Initialize mobile drawer functionality
 */
export function initMobileDrawer() {
  const sidebar = document.querySelector('#planning-sidebar, .dispo__sidebar, .app__sidebar');
  if (!sidebar) return;
  
  // Create burger button if not exists
  createBurgerButton();
  
  // Create overlay
  createOverlay();
  
  // Bind events
  bindDrawerEvents();
  
  console.log('[MobileDrawer] Initialized');
}

/**
 * Create burger menu button
 */
function createBurgerButton() {
  // Check if already exists
  if (document.querySelector('.burger-menu')) return;
  
  const topbar = document.querySelector('.topbar, .app__topbar');
  if (!topbar) return;
  
  const burger = document.createElement('button');
  burger.className = 'burger-menu';
  burger.setAttribute('aria-label', 'Menü öffnen');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-controls', 'mobile-drawer');
  burger.innerHTML = `
    <span class="burger-menu__line"></span>
    <span class="burger-menu__line"></span>
    <span class="burger-menu__line"></span>
  `;
  
  // Insert at beginning of topbar
  topbar.insertBefore(burger, topbar.firstChild);
}

/**
 * Create overlay element
 */
function createOverlay() {
  // Check if already exists
  if (document.querySelector('.drawer-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  
  document.body.appendChild(overlay);
}

/**
 * Bind drawer events
 */
function bindDrawerEvents() {
  // Burger click
  document.addEventListener('click', (e) => {
    if (e.target.closest('.burger-menu')) {
      e.preventDefault();
      toggleDrawer();
    }
  });
  
  // Overlay click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('drawer-overlay')) {
      e.preventDefault();
      closeDrawer();
    }
  });
  
  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDrawerOpen) {
      closeDrawer();
    }
  });
  
  // Window resize - close drawer if going back to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && isDrawerOpen) {
      closeDrawer();
    }
  });
}

/**
 * Toggle drawer open/close
 */
export function toggleDrawer() {
  if (isDrawerOpen) {
    closeDrawer();
  } else {
    openDrawer();
  }
}

/**
 * Open drawer
 */
export function openDrawer() {
  if (isDrawerOpen) return;
  
  const sidebar = document.querySelector('#planning-sidebar, .dispo__sidebar, .app__sidebar');
  const overlay = document.querySelector('.drawer-overlay');
  const burger = document.querySelector('.burger-menu');
  
  if (!sidebar) return;
  
  // Lock body scroll (iOS Safari compatible)
  bodyScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${bodyScrollPosition}px`;
  document.body.style.width = '100%';
  document.body.style.height = '100%';
  // iOS specific fixes
  document.body.style.touchAction = 'none';
  document.body.style.webkitOverflowScrolling = 'auto';
  
  // Open drawer
  sidebar.classList.add('drawer-open');
  sidebar.setAttribute('id', 'mobile-drawer');
  
  if (overlay) {
    overlay.classList.add('drawer-overlay--visible');
    overlay.setAttribute('aria-hidden', 'false');
  }
  
  if (burger) {
    burger.classList.add('burger-menu--active');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Menü schließen');
  }
  
  isDrawerOpen = true;
  
  // Focus first interactive element in drawer
  setTimeout(() => {
    const firstFocusable = sidebar.querySelector('button, a, input, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }, 300);
}

/**
 * Close drawer
 */
export function closeDrawer() {
  if (!isDrawerOpen) return;
  
  const sidebar = document.querySelector('#mobile-drawer, #planning-sidebar, .dispo__sidebar, .app__sidebar');
  const overlay = document.querySelector('.drawer-overlay');
  const burger = document.querySelector('.burger-menu');
  
  if (!sidebar) return;
  
  // Unlock body scroll (iOS Safari compatible)
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.height = '';
  document.body.style.touchAction = '';
  document.body.style.webkitOverflowScrolling = '';
  
  // Restore scroll position with requestAnimationFrame for smooth iOS behavior
  requestAnimationFrame(() => {
    window.scrollTo(0, bodyScrollPosition);
  });
  
  // Close drawer
  sidebar.classList.remove('drawer-open');
  
  if (overlay) {
    overlay.classList.remove('drawer-overlay--visible');
    overlay.setAttribute('aria-hidden', 'true');
  }
  
  if (burger) {
    burger.classList.remove('burger-menu--active');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menü öffnen');
  }
  
  isDrawerOpen = false;
  
  // Return focus to burger
  if (burger) {
    burger.focus();
  }
}

/**
 * Check if drawer is open
 * @returns {boolean}
 */
export function isDrawerOpenState() {
  return isDrawerOpen;
}

