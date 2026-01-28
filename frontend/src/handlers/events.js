/**
 * Central event delegation system
 * Replaces multiple event bindings with a single delegation system
 */

/**
 * Event delegation manager
 */
class EventDelegator {
  constructor() {
    this.handlers = new Map(); // Map<eventType, Map<selector, handler>>
    this.root = document;
    this.bound = false;
  }
  
  /**
   * Register event handler with delegation
   * @param {string} eventType - Event type (e.g. 'click', 'change')
   * @param {string} selector - CSS selector
   * @param {Function} handler - Event handler function
   * @param {object} options - Event options
   */
  on(eventType, selector, handler, options = {}) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map());
    }
    
    const typeHandlers = this.handlers.get(eventType);
    typeHandlers.set(selector, handler);
    
    // Bind to root if not already bound
    if (!this.bound) {
      this.bind();
    } else if (this.boundTypes && !this.boundTypes.has(eventType)) {
      // Bind new event type if system is already bound
      this.bindEventType(eventType);
    }
  }
  
  /**
   * Remove event handler
   * @param {string} eventType - Event type
   * @param {string} selector - CSS selector
   */
  off(eventType, selector) {
    const typeHandlers = this.handlers.get(eventType);
    if (typeHandlers) {
      typeHandlers.delete(selector);
    }
  }
  
  /**
   * Bind delegation listeners to root
   */
  bind() {
    if (this.bound) return;
    
    // Track bound event types
    this.boundTypes = new Set();
    
    // Bind each event type once
    for (const eventType of this.handlers.keys()) {
      this.bindEventType(eventType);
    }
    
    this.bound = true;
  }
  
  /**
   * Bind a specific event type
   */
  bindEventType(eventType) {
    if (this.boundTypes && this.boundTypes.has(eventType)) return;
    
    this.root.addEventListener(eventType, (e) => {
      this.handleEvent(e, eventType);
    }, true); // Use capture phase for delegation
    
    if (!this.boundTypes) this.boundTypes = new Set();
    this.boundTypes.add(eventType);
  }
  
  /**
   * Handle delegated event
   * @param {Event} e - Event object
   * @param {string} eventType - Event type
   */
  handleEvent(e, eventType) {
    const typeHandlers = this.handlers.get(eventType);
    if (!typeHandlers) return;
    
    // Check each selector
    for (const [selector, handler] of typeHandlers.entries()) {
      // Check if event target matches selector using closest
      let matchedElement = null;
      
      if (e.target.closest) {
        matchedElement = e.target.closest(selector);
      } else {
        // Fallback for browsers without closest
        let element = e.target;
        while (element && element !== this.root) {
          if (element.matches && element.matches(selector)) {
            matchedElement = element;
            break;
          }
          element = element.parentElement;
        }
      }
      
      if (matchedElement) {
        // Found match, call handler
        try {
          handler.call(matchedElement, e);
        } catch (error) {
          console.error(`Error in event handler for ${eventType} on ${selector}:`, error);
        }
        return; // Only handle first match
      }
    }
  }
  
  /**
   * Unbind all handlers
   */
  unbind() {
    // Note: We can't easily remove specific listeners, so we'll keep them
    // but clear the handlers map
    this.handlers.clear();
    this.bound = false;
  }
}

// Create singleton instance
const eventDelegator = new EventDelegator();

/**
 * Register event handler with delegation
 * @param {string} eventType - Event type
 * @param {string} selector - CSS selector
 * @param {Function} handler - Handler function
 * @param {object} options - Event options
 */
export function on(eventType, selector, handler, options = {}) {
  eventDelegator.on(eventType, selector, handler, options);
}

/**
 * Remove event handler
 * @param {string} eventType - Event type
 * @param {string} selector - CSS selector
 */
export function off(eventType, selector) {
  eventDelegator.off(eventType, selector);
}

/**
 * Bind delegation system (called once on app init)
 */
export function bind() {
  eventDelegator.bind();
}

/**
 * Unbind all handlers
 */
export function unbind() {
  eventDelegator.unbind();
}

// Export singleton for advanced usage
export const events = {
  on,
  off,
  bind,
  unbind
};

