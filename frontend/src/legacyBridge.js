/**
 * Legacy Bridge
 * Provides global access to modules for backward compatibility
 * This allows the old code to continue working while we migrate
 */

import { api } from './api/endpoints.js';
import { store, getState } from './state/store.js';
import * as timeUtils from './utils/time.js';
import * as formatUtils from './utils/format.js';
import * as validatorUtils from './utils/validators.js';
import * as domUtils from './utils/dom.js';
import * as selectors from './state/selectors.js';
import * as actions from './state/actions.js';

/**
 * Setup legacy bridge
 * Exposes modules globally for backward compatibility
 */
export function setupLegacyBridge() {
  // API - use window.api if available (from localApi.js), otherwise use our api
  if (!window.api) {
    window.api = api;
  }
  
  // State accessors (for compatibility with old code)
  window.data = {
    get currentUser() {
      return getState().data.currentUser;
    },
    get users() {
      return getState().data.users;
    },
    get workers() {
      return getState().data.workers;
    },
    get teams() {
      return getState().data.teams;
    },
    get locations() {
      return getState().data.locations;
    },
    get timeEntries() {
      return getState().data.timeEntries;
    },
    get assignments() {
      return getState().data.assignments;
    },
    set currentUser(value) {
      actions.setAuth(true, value);
    },
    set users(value) {
      actions.setUsers(value);
    },
    set workers(value) {
      actions.setWorkers(value);
    },
    set teams(value) {
      actions.setTeams(value);
    },
    set locations(value) {
      actions.setLocations(value);
    },
    set timeEntries(value) {
      actions.setTimeEntries(value);
    },
    set assignments(value) {
      // TODO: Add setAssignments action if needed
      store.setState({ data: { ...getState().data, assignments: value } });
    }
  };
  
  // State objects (for compatibility)
  window.workflowState = new Proxy({}, {
    get(target, prop) {
      return getState().workflow[prop];
    },
    set(target, prop, value) {
      store.setState({
        workflow: {
          ...getState().workflow,
          [prop]: value
        }
      });
      return true;
    }
  });
  
  window.uiState = new Proxy({}, {
    get(target, prop) {
      return getState().ui[prop];
    },
    set(target, prop, value) {
      store.setState({
        ui: {
          ...getState().ui,
          [prop]: value
        }
      });
      return true;
    }
  });
  
  window.timeEntryState = new Proxy({}, {
    get(target, prop) {
      return getState().timeEntry[prop];
    },
    set(target, prop, value) {
      store.setState({
        timeEntry: {
          ...getState().timeEntry,
          [prop]: value
        }
      });
      return true;
    }
  });
  
  window.timeEntryWizardState = new Proxy({}, {
    get(target, prop) {
      return getState().wizard[prop];
    },
    set(target, prop, value) {
      store.setState({
        wizard: {
          ...getState().wizard,
          [prop]: value
        }
      });
      return true;
    }
  });
  
  window.weekPlanningState = new Proxy({}, {
    get(target, prop) {
      return getState().weekPlanning[prop];
    },
    set(target, prop, value) {
      store.setState({
        weekPlanning: {
          ...getState().weekPlanning,
          [prop]: value
        }
      });
      return true;
    }
  });
  
  // Utility functions (for compatibility)
  window.parseHHMMToMinutes = timeUtils.parseHHMMToMinutes;
  window.durationMinutes = timeUtils.durationMinutes;
  window.calculateHoursFromTimes = timeUtils.calculateHoursFromTimes;
  window.entryMinutes = timeUtils.entryMinutes;
  window.entryHours = timeUtils.entryHours;
  window.getEntryHours = timeUtils.getEntryHours;
  window.groupByCategory = timeUtils.groupByCategory;
  window.minutesBetween = timeUtils.minutesBetween;
  window.calculateDuration = timeUtils.calculateDuration;
  
  window.getDayName = formatUtils.getDayName;
  window.formatDateForDisplay = formatUtils.formatDateForDisplay;
  window.formatDate = formatUtils.formatDate;
  window.formatDateTime = formatUtils.formatDateTime;
  window.formatDuration = formatUtils.formatDuration;
  window.formatTodayDate = formatUtils.formatTodayDate;
  window.formatLastLogin = formatUtils.formatLastLogin;
  window.slugifyStatus = formatUtils.slugifyStatus;
  window.getStatusLabel = formatUtils.getStatusLabel;
  window.getStatusClass = formatUtils.getStatusClass;
  window.toInputDateTime = formatUtils.toInputDateTime;
  window.toInputDate = formatUtils.toInputDate;
  window.formatDateLocal = formatUtils.formatDateLocal;
  
  window.validateTimeEntry = (workerId, date, timeFrom, timeTo, excludeEntryId) => {
    return validatorUtils.validateTimeEntry(
      getState().data.timeEntries,
      workerId,
      date,
      timeFrom,
      timeTo,
      excludeEntryId
    );
  };
  window.norm = validatorUtils.norm;
  
  window.getCurrentDate = domUtils.getCurrentDate;
  window.cloneAndReplaceElement = domUtils.cloneAndReplaceElement;
  
  // Selectors (for compatibility)
  window.getActiveUser = selectors.getActiveUser;
  window.getActiveWorkerId = selectors.getActiveWorkerId;
  window.getActiveUserId = selectors.getActiveUserId;
  window.getCalendarViewUserId = selectors.getCalendarViewUserId;
  window.getDefaultWorkHours = selectors.getDefaultWorkHours;
  
  // Store access
  window.store = store;
  window.getState = getState;
  
  // Render functions (will be set by views)
  // These are set by the view modules after they load
  window.renderApp = window.renderApp || (() => {
    console.warn('renderApp not yet loaded');
  });
  
  window.renderLogin = window.renderLogin || (() => {
    console.warn('renderLogin not yet loaded');
  });
  
  window.renderTopbar = window.renderTopbar || (() => '');
  window.renderFooter = window.renderFooter || (() => '');
  window.renderPlanningShell = window.renderPlanningShell || (() => '');
  window.renderManagementShell = window.renderManagementShell || (() => ''); // Verwalten entfernt
  
  // Modal functions (from old app.js, will be migrated)
  window.renderTimeEntryModal = window.renderTimeEntryModal || (() => '');
  window.renderTimeEntryWizard = window.renderTimeEntryWizard || (() => '');
  window.renderEmployeeCalendarModal = window.renderEmployeeCalendarModal || (() => '');
  window.openTimeEntryModal = window.openTimeEntryModal || (() => {});
  window.closeTimeEntryModal = window.closeTimeEntryModal || (() => {});
  
  // Enhanced openTimeEntryWizard that uses activeDate
  const originalOpenWizard = window.openTimeEntryWizard;
  window.openTimeEntryWizard = function(suggestedDate = null, suggestedStartTime = null, suggestedEndTime = null) {
    // Use activeDate if no date provided (Single Source of Truth)
    const state = getState();
    const activeDate = state.ui.activeDate || state.planning.selectedDate;
    const dateToUse = suggestedDate || activeDate || state.ui.selectedDay || state.ui.calendarDate || new Date();
    
    if (originalOpenWizard) {
      return originalOpenWizard(dateToUse, suggestedStartTime, suggestedEndTime);
    } else {
      console.warn('openTimeEntryWizard not available from old app.js');
    }
  };
  
  // Other functions from old app.js (will be migrated)
  window.renderActiveView = window.renderActiveView || (() => '<div>View wird geladen...</div>');
  window.loadAllData = window.loadAllData || (async () => {});
  window.checkCurrentSession = window.checkCurrentSession || (async () => false);
  
  // Planning functions
  window.confirmDayFromPlanning = window.confirmDayFromPlanning || (async () => ({ success: false }));
  window.savePlanningEntry = window.savePlanningEntry || (async () => ({ success: false }));
  window.loadPlanningEntries = window.loadPlanningEntries || (async () => []);
  
  // User management modal functions
  window.closeUserModal = window.closeUserModal || (() => {});
  window.openCreateUserModal = window.openCreateUserModal || (() => {});
  window.openEditUserModal = window.openEditUserModal || (() => {});
  
  console.log('[LegacyBridge] Legacy compatibility layer initialized');
}

