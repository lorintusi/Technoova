/**
 * Modular App Entry Point
 * This file loads modules and initializes the application
 * It replaces the old monolithic app.js
 */

// Load modules dynamically (since we can't use ES6 imports in vanilla JS without build tools)
// We'll use a module loader pattern

(function() {
  'use strict';
  
  // Module registry
  const modules = {};
  const moduleQueue = [];
  
  /**
   * Define a module
   */
  function define(name, dependencies, factory) {
    modules[name] = { dependencies, factory, loaded: false, exports: {} };
  }
  
  /**
   * Require a module
   */
  function require(name) {
    const module = modules[name];
    if (!module) {
      throw new Error(`Module ${name} not found`);
    }
    
    if (!module.loaded) {
      // Load dependencies first
      const deps = module.dependencies.map(dep => require(dep));
      // Execute factory
      module.factory.apply(null, deps);
      module.loaded = true;
    }
    
    return module.exports;
  }
  
  // Load modules in order
  const moduleScripts = [
    'app/utils/time.js',
    'app/utils/format.js',
    'app/utils/validators.js',
    'app/utils/dom.js',
    'app/api/client.js',
    'app/api/endpoints.js',
    'app/state/store.js',
    'app/state/selectors.js',
    'app/state/actions.js',
    'app/handlers/events.js',
    'app/views/modals/modalHost.js',
    'app/legacyBridge.js',
    'app/bootstrap.js'
  ];
  
  // For now, we'll load the old app.js after modules are ready
  // This ensures backward compatibility while we migrate
  
  console.log('[App-Modular] Starting module system...');
  
  // Load old app.js (it will use the modules via legacy bridge)
  const oldAppScript = document.createElement('script');
  oldAppScript.src = 'app.js';
  oldAppScript.defer = true;
  oldAppScript.onload = function() {
    console.log('[App-Modular] Old app.js loaded, migration in progress...');
  };
  document.body.appendChild(oldAppScript);
  
})();

