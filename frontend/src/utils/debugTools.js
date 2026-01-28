/**
 * Debug Tools
 * Development-only utilities for debugging CRUD → State → UI flow
 */

export function setupDebugTools(getState, api) {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return; // Only in development
  }

  window.__dbg = {
    // State access
    getState,
    api,
    
    // Quick state snapshot
    logState: () => {
      const state = getState();
      console.group('🔍 Current State Snapshot');
      console.log('Users:', state.data.users?.length || 0, state.data.users);
      console.log('Workers:', state.data.workers?.length || 0, state.data.workers);
      console.log('Locations:', state.data.locations?.length || 0, state.data.locations);
      console.log('Vehicles:', state.data.vehicles?.length || 0, state.data.vehicles);
      console.log('Devices:', state.data.devices?.length || 0, state.data.devices);
      console.log('Dispatch Items:', state.data.dispatchItems?.length || 0);
      console.log('---');
      console.log('Resource Context:', state.ui.resourceContext);
      console.log('Active View:', state.ui.activeView);
      console.log('Active Mode:', state.ui.activeMode);
      console.log('Management Tab:', state.ui.managementTab);
      console.groupEnd();
    },
    
    // Resource-specific details
    logResource: (type) => {
      const state = getState();
      const data = state.data[type];
      console.group(`🔍 ${type} Details`);
      console.log('Count:', data?.length || 0);
      console.log('Raw data:', data);
      if (data && data.length > 0) {
        console.log('First item:', data[0]);
        console.log('IDs:', data.map(item => item.id));
      }
      console.groupEnd();
    },
    
    // Test selector outputs
    logSelectors: async () => {
      const { getUsers, getWorkers, getLocations, getVehicles, getDevices } = await import('../state/selectors.js');
      console.group('🔍 Selector Outputs');
      console.log('getUsers():', getUsers());
      console.log('getWorkers():', getWorkers());
      console.log('getLocations():', getLocations());
      console.log('getVehicles():', getVehicles());
      console.log('getDevices():', getDevices());
      console.groupEnd();
    },
    
    // Test create flow
    testCreate: async (type, payload) => {
      console.group(`🧪 Test Create ${type}`);
      const state = getState();
      console.log('Before:', state.data[type]?.length || 0);
      
      try {
        const methodName = `create${type.charAt(0).toUpperCase() + type.slice(1, -1)}`; // users -> createUser
        const result = await api[methodName](payload);
        console.log('API Response:', result);
        
        // Wait a bit for state update
        setTimeout(() => {
          const newState = getState();
          console.log('After:', newState.data[type]?.length || 0);
          console.log('State data:', newState.data[type]);
        }, 100);
      } catch (error) {
        console.error('Error:', error);
      }
      console.groupEnd();
    },
    
    // Compare API vs State vs Selector
    compareFlow: async (type) => {
      console.group(`🔬 Compare Flow: ${type}`);
      
      // 1. API
      try {
        const methodName = `get${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const apiResult = await api[methodName]();
        console.log('1️⃣ API Response:', apiResult);
      } catch (e) {
        console.error('API Error:', e);
      }
      
      // 2. State
      const state = getState();
      console.log('2️⃣ State:', state.data[type]);
      
      // 3. Selector
      try {
        const selectorsModule = await import('../state/selectors.js');
        const selectorName = `get${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const selectorResult = selectorsModule[selectorName]();
        console.log('3️⃣ Selector:', selectorResult);
      } catch (e) {
        console.error('Selector Error:', e);
      }
      
      console.groupEnd();
    }
  };
  
  console.log('🛠️ Debug tools available: window.__dbg');
  console.log('📊 Commands:');
  console.log('  __dbg.logState() - Show all state counts');
  console.log('  __dbg.logResource("users") - Show specific resource');
  console.log('  __dbg.logSelectors() - Show selector outputs');
  console.log('  __dbg.compareFlow("users") - Compare API → State → Selector');
  console.log('  __dbg.testCreate("users", {...}) - Test create flow');
}

