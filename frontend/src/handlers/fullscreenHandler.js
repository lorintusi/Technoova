/**
 * Fullscreen Handler
 * Handles fullscreen mode toggle
 */

import { on } from './events.js';

/**
 * Update fullscreen button icon based on state
 */
function updateFullscreenIcon(isFullscreen) {
  const fullscreenBtn = document.getElementById('btn-fullscreen');
  if (!fullscreenBtn) return;

  if (isFullscreen) {
    // Exit fullscreen icon
    fullscreenBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 3V5M16 3V5M3 8H5M19 8H21M3 16H5M19 16H21M8 21V19M16 21V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="9" y="9" width="6" height="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    fullscreenBtn.title = "Vollbildmodus beenden (ESC)";
  } else {
    // Enter fullscreen icon
    fullscreenBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    fullscreenBtn.title = "Vollbildmodus";
  }
}

/**
 * Bind fullscreen handlers
 */
export function bindFullscreenHandlers() {
  // Toggle fullscreen on button click
  on('click', '#btn-fullscreen', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        await document.documentElement.requestFullscreen();
        updateFullscreenIcon(true);
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
        updateFullscreenIcon(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
      // Show user-friendly message
      if (error.name === 'TypeError') {
        console.warn('Fullscreen API not supported in this browser');
      }
    }
  });
  
  // Listen for fullscreen changes (ESC key, browser controls, etc.)
  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement;
    updateFullscreenIcon(isFullscreen);
  });
  
  // Handle ESC key explicitly for better UX
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.fullscreenElement) {
      // Browser will handle exit, we just update icon
      setTimeout(() => {
        updateFullscreenIcon(false);
      }, 100);
    }
  });
  
  console.log('[FullscreenHandler] Fullscreen handlers bound');
}
