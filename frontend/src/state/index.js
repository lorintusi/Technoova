/**
 * State Public API (Barrel Export)
 * Single source of truth for state imports
 * 
 * Usage:
 *   import { getState, setState, getActiveUser } from '../state/index.js';
 * 
 * DO NOT import directly from store.js, actions.js, or selectors.js
 */

export * from './store.js';
export * from './actions.js';
export * from './selectors.js';


