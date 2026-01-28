/**
 * Central state store (Single Source of Truth)
 * Consolidates all state objects into one tree
 */

// Initial state structure
const initialState = {
  // Workflow state
  workflow: {
    viewMode: 'day', // 'day' | 'week' | 'month' | 'year' | 'team'
    selectedDate: null, // 'YYYY-MM-DD'
    selectedWeekStart: null, // 'YYYY-MM-DD' (Monday)
    cache: {
      dayEntries: [],
      weekEntries: [],
      teamData: null
    }
  },
  
  // UI state
  ui: {
    activeMode: "plan", // plan | manage
    activeView: "calendar",
    calendarViewMode: "week", // year | month | week | day
    timeGridDragState: null, // { isDragging, startTime, startColumn, startY }
    draggedWorkerId: null,
    draggedTeamId: null, // Team ID being dragged
    calendarDate: new Date(), // Current date for calendar navigation
    dragStartCell: null, // Start cell for multi-day selection
    dragEndCell: null, // End cell for multi-day selection
    selectedDay: null, // Selected day for day details view
    selectedLocationId: null, // Selected location for assignment
    isMultiSelect: false, // Multi-select mode active
    selectedCells: [], // Array of selected cells for multi-assignment
    todayDetailsExpanded: false, // Today's details expanded state
    draggedFromLocationId: null, // Location ID where drag started (for moving)
    draggedFromDay: null, // Day where drag started (for moving)
    isAuthenticated: false, // Authentication state
    currentUserId: null, // Current logged in user ID
    timeSummaryCache: {}, // Cache for time summaries
    selectedUserId: null, // Selected user for admin view (null = current user)
    calendarViewUserId: null, // User ID whose calendar is being viewed (null = own calendar, admin only)
    isEmployeeCalendarModalOpen: false, // Employee calendar selection modal open state
    activeDate: null, // Active date for time entry wizard (YYYY-MM-DD) - Single Source of Truth
    showTeamCalendar: false, // Team calendar view toggle
    managementTab: 'users', // Active tab in management view: 'users' | 'locations' | 'medical'
    planningSidebarCollapsed: false, // Planning sidebar collapsed state (for responsive)
    resourceContext: 'WORKER', // Active resource context in dock: 'WORKER' | 'VEHICLE' | 'DEVICE' | 'LOCATION' | 'DISPATCH'
    resourceQuery: '', // Search query for resource sidebar
    unassignedQuery: '', // Search query for unassigned panel
    selectedResource: null, // Selected resource: { type: 'LOCATION'|'DISPATCH'|'WORKER'|'VEHICLE'|'DEVICE', id: string|null }
    dayViewMode: 'timeline', // Day view mode: 'timeline' | 'grid'
    rightPanelCollapsed: false // Right panel (unassigned) collapsed state
  },
  
  // Time entry modal state
  timeEntry: {
    isModalOpen: false,
    editingEntry: null,
    locationId: null,
    date: null,
    dayName: null
  },
  
  // Time entry wizard state
  wizard: {
    isOpen: false,
    step: 1, // 1: Datum/Zeit, 2: Kategorie, 3: Projekt/Baustelle (nur bei Standard-Kategorie)
    date: null,
    startTime: null,
    endTime: null,
    locationId: null,
    category: 'BUERO_ALLGEMEIN',
    categoryType: 'standard', // 'standard' | 'project'
    selectedProjectId: null, // Wenn Projekt-Kategorie gewählt
    notes: '',
    replaceExisting: false,
    selectedUserId: null // Admin: selected user for planning (null = current user)
  },
  
  // Week planning state
  weekPlanning: {
    selectedWorkerId: null,
    selectedWeek: null,
    selectedYear: null,
    weekData: [],
    weekStart: null,
    weekEnd: null,
    hasUnsavedChanges: false,
    planningForWorkerId: null // Admin: selected worker for planning
  },
  
  // Planning entries (blocks)
  planning: {
    entries: [], // Array of PlanningEntry objects
    selectedDate: null, // Active date for planning (Single Source of Truth)
    selectedWorkerId: null // Selected worker for planning (Admin only)
  },
  
  // Data state
  data: {
    currentUser: null, // Will be set after login
    users: [],
    workers: [],
    teams: [],
    locations: [],
    timeEntries: [],
    assignments: [], // Viaplano: Einsätze (Location + Zeitraum)
    medicalCertificates: [], // Medical certificates for KRANK planning
    vehicles: [], // Vehicles (Fahrzeuge)
    devices: [], // Devices (Geräte)
    dispatchItems: [], // Dispatch items (Einsätze)
    dispatchAssignments: [], // Viaplano: Planungen pro Tag (Einsatz + Datum + Worker + Ressourcen)
    todos: [] // Todos/Notizen
  }
};

// Current state
let state = JSON.parse(JSON.stringify(initialState)); // Deep clone

// Subscribers
const subscribers = [];

/**
 * Get current state
 * @returns {object} Current state (read-only copy)
 */
export function getState() {
  return JSON.parse(JSON.stringify(state)); // Return deep copy
}

/**
 * Get state path (for nested access)
 * @param {string} path - Dot-separated path (e.g. 'ui.activeMode')
 * @returns {*} Value at path
 */
export function getStatePath(path) {
  const parts = path.split('.');
  let value = state;
  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }
  return value;
}

/**
 * Set state (partial update)
 * @param {object|function} update - Partial state update or updater function
 */
export function setState(update) {
  if (typeof update === 'function') {
    state = { ...state, ...update(state) };
  } else {
    state = { ...state, ...update };
  }
  
  // Notify subscribers
  subscribers.forEach(subscriber => {
    try {
      subscriber(state);
    } catch (error) {
      console.error('State subscriber error:', error);
    }
  });
}

/**
 * Subscribe to state changes
 * @param {function} listener - Callback function
 * @returns {function} Unsubscribe function
 */
export function subscribe(listener) {
  subscribers.push(listener);
  return () => {
    const index = subscribers.indexOf(listener);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  };
}

/**
 * Reset state to initial
 */
export function resetState() {
  state = JSON.parse(JSON.stringify(initialState));
  subscribers.forEach(subscriber => {
    try {
      subscriber(state);
    } catch (error) {
      console.error('State subscriber error:', error);
    }
  });
}

// Export store object for compatibility
export const store = {
  getState,
  setState,
  subscribe,
  resetState
};

