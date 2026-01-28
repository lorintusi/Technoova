/**
 * State actions
 * Functions that mutate state in a controlled way
 */

import { setState, getState } from './store.js';

/**
 * Set authentication state
 * @param {boolean} isAuthenticated - Authentication status
 * @param {object|null} currentUser - Current user object
 */
export function setAuth(isAuthenticated, currentUser = null) {
  setState({
    ui: {
      ...getState().ui,
      isAuthenticated,
      currentUserId: currentUser?.id || null
    },
    data: {
      ...getState().data,
      currentUser
    }
  });
}

/**
 * Set UI mode
 * @param {string} activeMode - Mode ('plan' | 'manage')
 */
export function setUIMode(activeMode) {
  setState({
    ui: {
      ...getState().ui,
      activeMode
    }
  });
}

/**
 * Set calendar view mode
 * @param {string} calendarViewMode - View mode ('year' | 'month' | 'week' | 'day')
 */
export function setCalendarViewMode(calendarViewMode) {
  setState({
    ui: {
      ...getState().ui,
      calendarViewMode
    }
  });
}

/**
 * Set selected date
 * @param {Date|string} date - Selected date
 */
export function setSelectedDate(date) {
  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
  setState({
    workflow: {
      ...getState().workflow,
      selectedDate: dateStr
    }
  });
}

/**
 * Set calendar date
 * @param {Date} date - Calendar date
 */
export function setCalendarDate(date) {
  setState({
    ui: {
      ...getState().ui,
      calendarDate: date
    }
  });
}

/**
 * Set time entries
 * @param {Array} timeEntries - Time entries array
 */
export function setTimeEntries(timeEntries) {
  setState({
    data: {
      ...getState().data,
      timeEntries
    }
  });
}

/**
 * Update time entry
 * @param {object} entry - Updated entry
 */
export function updateTimeEntry(entry) {
  const state = getState();
  const timeEntries = state.data.timeEntries.map(e => 
    e.id === entry.id ? entry : e
  );
  setTimeEntries(timeEntries);
}

/**
 * Add time entry
 * @param {object} entry - New entry
 */
export function addTimeEntry(entry) {
  const state = getState();
  setTimeEntries([...state.data.timeEntries, entry]);
}

/**
 * Remove time entry
 * @param {string|number} entryId - Entry ID to remove
 */
export function removeTimeEntry(entryId) {
  const state = getState();
  setTimeEntries(state.data.timeEntries.filter(e => e.id !== entryId));
}

/**
 * Dedupe array by id
 * @param {Array} items - Array of items with id property
 * @returns {Array} Deduped array
 */
function dedupeById(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Map();
  return items.filter(item => {
    if (!item || !item.id) return false;
    const id = String(item.id);
    if (seen.has(id)) {
      // Update existing with newer data (last one wins)
      const existingIndex = seen.get(id);
      items[existingIndex] = item;
      return false;
    }
    seen.set(id, items.indexOf(item));
    return true;
  });
}

/**
 * Upsert users (dedupe by id)
 * @param {Array|object} usersOrUser - Users array or single user object
 */
export function setUsers(usersOrUser) {
  const state = getState();
  const existingUsers = state.data.users || [];
  
  // Normalize to array
  const newUsers = Array.isArray(usersOrUser) ? usersOrUser : [usersOrUser];
  
  // Merge: update existing, add new
  const merged = [...existingUsers];
  newUsers.forEach(newUser => {
    if (!newUser || !newUser.id) return;
    const existingIndex = merged.findIndex(u => String(u.id) === String(newUser.id));
    if (existingIndex >= 0) {
      merged[existingIndex] = newUser; // Update existing
    } else {
      merged.push(newUser); // Add new
    }
  });
  
  // Final dedupe
  const deduped = dedupeById(merged);
  
  setState({
    data: {
      ...state.data,
      users: deduped
    }
  });
}

/**
 * Upsert user (insert or update)
 * @param {object} user - User object
 */
export function upsertUser(user) {
  const state = getState();
  if (!user || !user.id) {
    console.warn('upsertUser: user must have id');
    return;
  }
  
  const existingIndex = state.data.users.findIndex(u => String(u.id) === String(user.id));
  
  if (existingIndex >= 0) {
    // Update existing
    setState({
      data: {
        ...state.data,
        users: state.data.users.map((u, i) => i === existingIndex ? user : u)
      }
    });
  } else {
    // Add new
    setState({
      data: {
        ...state.data,
        users: [...state.data.users, user]
      }
    });
  }
}

/**
 * Remove user
 * @param {string|number} userId - User ID to remove
 */
export function removeUser(userId) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      users: state.data.users.filter(u => String(u.id) !== String(userId))
    }
  });
}

/**
 * Upsert workers (dedupe by id)
 * @param {Array|object} workersOrWorker - Workers array or single worker object
 */
export function setWorkers(workersOrWorker) {
  const state = getState();
  const existingWorkers = state.data.workers || [];
  
  // Normalize to array
  const newWorkers = Array.isArray(workersOrWorker) ? workersOrWorker : [workersOrWorker];
  
  // Merge: update existing, add new
  const merged = [...existingWorkers];
  newWorkers.forEach(newWorker => {
    if (!newWorker || !newWorker.id) return;
    const existingIndex = merged.findIndex(w => String(w.id) === String(newWorker.id));
    if (existingIndex >= 0) {
      merged[existingIndex] = newWorker; // Update existing
    } else {
      merged.push(newWorker); // Add new
    }
  });
  
  // Final dedupe
  const deduped = dedupeById(merged);
  
  setState({
    data: {
      ...state.data,
      workers: deduped
    }
  });
}

/**
 * Upsert worker (insert or update)
 * @param {object} worker - Worker object
 */
export function upsertWorker(worker) {
  const state = getState();
  if (!worker || !worker.id) {
    console.warn('upsertWorker: worker must have id');
    return;
  }
  
  const existingIndex = state.data.workers.findIndex(w => String(w.id) === String(worker.id));
  
  if (existingIndex >= 0) {
    // Update existing
    setState({
      data: {
        ...state.data,
        workers: state.data.workers.map((w, i) => i === existingIndex ? worker : w)
      }
    });
  } else {
    // Add new
    setState({
      data: {
        ...state.data,
        workers: [...state.data.workers, worker]
      }
    });
  }
}

/**
 * Remove worker
 * @param {string|number} workerId - Worker ID to remove
 */
export function removeWorker(workerId) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      workers: state.data.workers.filter(w => String(w.id) !== String(workerId))
    }
  });
}

/**
 * Set teams
 * @param {Array} teams - Teams array
 */
export function setTeams(teams) {
  setState({
    data: {
      ...getState().data,
      teams
    }
  });
}

/**
 * Upsert locations (dedupe by id)
 * @param {Array|object} locationsOrLocation - Locations array or single location object
 */
export function setLocations(locationsOrLocation) {
  const state = getState();
  const existingLocations = state.data.locations || [];
  
  // Normalize to array
  const newLocations = Array.isArray(locationsOrLocation) ? locationsOrLocation : [locationsOrLocation];
  
  // Merge: update existing, add new
  const merged = [...existingLocations];
  newLocations.forEach(newLocation => {
    if (!newLocation || !newLocation.id) return;
    const existingIndex = merged.findIndex(l => String(l.id) === String(newLocation.id));
    if (existingIndex >= 0) {
      merged[existingIndex] = newLocation; // Update existing
    } else {
      merged.push(newLocation); // Add new
    }
  });
  
  // Final dedupe
  const deduped = dedupeById(merged);
  
  setState({
    data: {
      ...state.data,
      locations: deduped
    }
  });
}

/**
 * Upsert location (add or update single location)
 * @param {object} location - Location object
 */
export function upsertLocation(location) {
  if (!location || !location.id) {
    console.warn('upsertLocation: Invalid location object', location);
    return;
  }
  
  const state = getState();
  const locations = state.data.locations || [];
  const existingIndex = locations.findIndex(l => String(l.id) === String(location.id));
  
  let updated;
  if (existingIndex >= 0) {
    // Update existing
    updated = [...locations];
    updated[existingIndex] = location;
  } else {
    // Add new
    updated = [...locations, location];
  }
  
  // Dedupe
  const deduped = dedupeById(updated);
  
  setState({
    data: {
      ...state.data,
      locations: deduped
    }
  });
}

/**
 * Remove location
 * @param {string} locationId - Location ID
 */
export function removeLocation(locationId) {
  const state = getState();
  const locations = state.data.locations || [];
  const filtered = locations.filter(l => String(l.id) !== String(locationId));
  
  setState({
    data: {
      ...state.data,
      locations: filtered
    }
  });
}

/**
 * Set planning entries
 * @param {Array} entries - Planning entries array
 */
export function setPlanningEntries(entries) {
  setState({
    planning: {
      ...getState().planning,
      entries
    }
  });
}

/**
 * Add planning entry
 * @param {object} entry - Planning entry object
 */
export function addPlanningEntry(entry) {
  const state = getState();
  setState({
    planning: {
      ...state.planning,
      entries: [...state.planning.entries, entry]
    }
  });
}

/**
 * Update planning entry
 * @param {object} entry - Updated planning entry
 */
export function updatePlanningEntry(entry) {
  const state = getState();
  setState({
    planning: {
      ...state.planning,
      entries: state.planning.entries.map(e => 
        e.id === entry.id ? entry : e
      )
    }
  });
}

/**
 * Remove planning entry
 * @param {string|number} entryId - Entry ID to remove
 */
export function removePlanningEntry(entryId) {
  const state = getState();
  setState({
    planning: {
      ...state.planning,
      entries: state.planning.entries.filter(e => e.id !== entryId)
    }
  });
}

/**
 * Set active date (Single Source of Truth)
 * @param {string} date - Date string (YYYY-MM-DD)
 */
export function setActiveDate(date) {
  setState({
    ui: {
      ...getState().ui,
      activeDate: date
    },
    planning: {
      ...getState().planning,
      selectedDate: date
    }
  });
}

/**
 * Set planning for worker ID (legacy, maps to planning.selectedWorkerId)
 * @param {string|number|null} workerId - Worker ID to plan for
 */
export function setPlanningForWorker(workerId) {
  setSelectedPlanningWorkerId(workerId);
}

/**
 * Set selected planning worker ID
 * @param {string|number|null} workerId - Worker ID to plan for
 */
export function setSelectedPlanningWorkerId(workerId) {
  setState({
    planning: {
      ...getState().planning,
      selectedWorkerId: workerId
    },
    weekPlanning: {
      ...getState().weekPlanning,
      planningForWorkerId: workerId // Keep legacy compatibility
    }
  });
}

/**
 * Upsert planning entries (add or update)
 * @param {Array} entries - Planning entries to upsert
 */
export function upsertPlanningEntries(entries) {
  const state = getState();
  const existingEntries = state.planning.entries || [];
  const entryMap = new Map(existingEntries.map(e => [e.id, e]));
  
  entries.forEach(entry => {
    entryMap.set(entry.id, entry);
  });
  
  setPlanningEntries(Array.from(entryMap.values()));
}

/**
 * Mark planning entries as confirmed
 * @param {Array} entryIds - Planning entry IDs to mark as confirmed
 * @param {Object} timeEntryMap - Map of entryId -> timeEntryId
 */
export function markPlanningEntriesConfirmed(entryIds, timeEntryMap = {}) {
  const state = getState();
  const updatedEntries = state.planning.entries.map(entry => {
    if (entryIds.includes(entry.id)) {
      return {
        ...entry,
        status: 'CONFIRMED',
        timeEntryId: timeEntryMap[entry.id] || entry.timeEntryId,
        updatedAt: new Date().toISOString()
      };
    }
    return entry;
  });
  
  setPlanningEntries(updatedEntries);
}

/**
 * Set team calendar visibility
 * @param {boolean} show - Show team calendar
 */
export function setShowTeamCalendar(show) {
  setState({
    ui: {
      ...getState().ui,
      showTeamCalendar: show
    }
  });
}

/**
 * Set medical certificates
 * @param {Array} certificates - Medical certificates array
 */
export function setMedicalCertificates(certificates) {
  setState({
    data: {
      ...getState().data,
      medicalCertificates: Array.isArray(certificates) ? certificates : []
    }
  });
}

/**
 * Add medical certificate
 * @param {object} certificate - New certificate
 */
export function addMedicalCertificate(certificate) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      medicalCertificates: [...state.data.medicalCertificates, certificate]
    }
  });
}

/**
 * Update medical certificate
 * @param {object} certificate - Updated certificate
 */
export function updateMedicalCertificate(certificate) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      medicalCertificates: state.data.medicalCertificates.map(c => 
        c.id === certificate.id ? certificate : c
      )
    }
  });
}

/**
 * Remove medical certificate
 * @param {string|number} certificateId - Certificate ID to remove
 */
export function removeMedicalCertificate(certificateId) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      medicalCertificates: state.data.medicalCertificates.filter(c => c.id !== certificateId)
    }
  });
}

/**
 * Upsert vehicles (dedupe by id)
 * @param {Array|object} vehiclesOrVehicle - Vehicles array or single vehicle object
 */
export function setVehicles(vehiclesOrVehicle) {
  const state = getState();
  const existingVehicles = state.data.vehicles || [];
  
  // Normalize to array
  const newVehicles = Array.isArray(vehiclesOrVehicle) ? vehiclesOrVehicle : [vehiclesOrVehicle];
  
  // Merge: update existing, add new
  const merged = [...existingVehicles];
  newVehicles.forEach(newVehicle => {
    if (!newVehicle || !newVehicle.id) return;
    const existingIndex = merged.findIndex(v => String(v.id) === String(newVehicle.id));
    if (existingIndex >= 0) {
      merged[existingIndex] = newVehicle; // Update existing
    } else {
      merged.push(newVehicle); // Add new
    }
  });
  
  // Final dedupe
  const deduped = dedupeById(merged);
  
  setState({
    data: {
      ...state.data,
      vehicles: deduped
    }
  });
}

/**
 * Upsert vehicle (insert or update)
 * @param {object} vehicle - Vehicle object
 */
export function upsertVehicle(vehicle) {
  const state = getState();
  const existingIndex = state.data.vehicles.findIndex(v => v.id === vehicle.id);
  
  if (existingIndex >= 0) {
    // Update existing
    setState({
      data: {
        ...state.data,
        vehicles: state.data.vehicles.map((v, i) => i === existingIndex ? vehicle : v)
      }
    });
  } else {
    // Add new
    setState({
      data: {
        ...state.data,
        vehicles: [...state.data.vehicles, vehicle]
      }
    });
  }
}

/**
 * Remove vehicle
 * @param {string|number} vehicleId - Vehicle ID to remove
 */
export function removeVehicle(vehicleId) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      vehicles: state.data.vehicles.filter(v => v.id !== vehicleId)
    }
  });
}

/**
 * Upsert devices (dedupe by id)
 * @param {Array|object} devicesOrDevice - Devices array or single device object
 */
export function setDevices(devicesOrDevice) {
  const state = getState();
  const existingDevices = state.data.devices || [];
  
  // Normalize to array
  const newDevices = Array.isArray(devicesOrDevice) ? devicesOrDevice : [devicesOrDevice];
  
  // Merge: update existing, add new
  const merged = [...existingDevices];
  newDevices.forEach(newDevice => {
    if (!newDevice || !newDevice.id) return;
    const existingIndex = merged.findIndex(d => String(d.id) === String(newDevice.id));
    if (existingIndex >= 0) {
      merged[existingIndex] = newDevice; // Update existing
    } else {
      merged.push(newDevice); // Add new
    }
  });
  
  // Final dedupe
  const deduped = dedupeById(merged);
  
  setState({
    data: {
      ...state.data,
      devices: deduped
    }
  });
}

/**
 * Upsert device (insert or update)
 * @param {object} device - Device object
 */
export function upsertDevice(device) {
  const state = getState();
  const existingIndex = state.data.devices.findIndex(d => d.id === device.id);
  
  if (existingIndex >= 0) {
    // Update existing
    setState({
      data: {
        ...state.data,
        devices: state.data.devices.map((d, i) => i === existingIndex ? device : d)
      }
    });
  } else {
    // Add new
    setState({
      data: {
        ...state.data,
        devices: [...state.data.devices, device]
      }
    });
  }
}

/**
 * Remove device
 * @param {string|number} deviceId - Device ID to remove
 */
export function removeDevice(deviceId) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      devices: state.data.devices.filter(d => d.id !== deviceId)
    }
  });
}

/**
 * Upsert dispatch items (dedupe by id)
 * @param {Array|object} itemsOrItem - Dispatch items array or single item object
 */
export function setDispatchItems(itemsOrItem) {
  const state = getState();
  const existingItems = state.data.dispatchItems || [];
  
  // Normalize to array
  const newItems = Array.isArray(itemsOrItem) ? itemsOrItem : [itemsOrItem];
  
  // Merge: update existing, add new
  const merged = [...existingItems];
  newItems.forEach(newItem => {
    if (!newItem || !newItem.id) return;
    const existingIndex = merged.findIndex(i => String(i.id) === String(newItem.id));
    if (existingIndex >= 0) {
      merged[existingIndex] = newItem; // Update existing
    } else {
      merged.push(newItem); // Add new
    }
  });
  
  // Final dedupe
  const deduped = dedupeById(merged);
  
  setState({
    data: {
      ...state.data,
      dispatchItems: deduped
    }
  });
}

/**
 * Upsert dispatch item (insert or update)
 * @param {object} item - Dispatch item object
 */
export function upsertDispatchItem(item) {
  const state = getState();
  const existingIndex = state.data.dispatchItems.findIndex(d => d.id === item.id);
  
  if (existingIndex >= 0) {
    // Update existing
    setState({
      data: {
        ...state.data,
        dispatchItems: state.data.dispatchItems.map((d, i) => i === existingIndex ? item : d)
      }
    });
  } else {
    // Add new
    setState({
      data: {
        ...state.data,
        dispatchItems: [...state.data.dispatchItems, item]
      }
    });
  }
}

/**
 * Remove dispatch item
 * @param {string|number} itemId - Dispatch item ID to remove
 */
export function removeDispatchItem(itemId) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      dispatchItems: state.data.dispatchItems.filter(d => d.id !== itemId),
      dispatchAssignments: state.data.dispatchAssignments.filter(a => a.dispatchItemId !== itemId && a.dispatch_item_id !== itemId)
    }
  });
}

/**
 * Upsert dispatch assignments (dedupe by id)
 * @param {Array|object} assignmentsOrAssignment - Assignments array or single assignment object
 */
export function setDispatchAssignments(assignmentsOrAssignment) {
  const state = getState();
  const existingAssignments = state.data.dispatchAssignments || [];
  
  // Normalize to array
  const newAssignments = Array.isArray(assignmentsOrAssignment) ? assignmentsOrAssignment : [assignmentsOrAssignment];
  
  // Merge: update existing, add new
  const merged = [...existingAssignments];
  newAssignments.forEach(newAssignment => {
    if (!newAssignment || !newAssignment.id) return;
    const existingIndex = merged.findIndex(a => String(a.id) === String(newAssignment.id));
    if (existingIndex >= 0) {
      merged[existingIndex] = newAssignment; // Update existing
    } else {
      merged.push(newAssignment); // Add new
    }
  });
  
  // Final dedupe
  const deduped = dedupeById(merged);
  
  setState({
    data: {
      ...state.data,
      dispatchAssignments: deduped
    }
  });
}

/**
 * Upsert dispatch assignments (batch)
 * @param {Array} assignments - Array of dispatch assignment objects
 */
export function upsertDispatchAssignments(assignments) {
  const state = getState();
  const existing = new Map();
  
  // Build map of existing assignments
  state.data.dispatchAssignments.forEach(a => {
    const key = `${a.dispatchItemId || a.dispatch_item_id}-${a.resourceType || a.resource_type}-${a.resourceId || a.resource_id}-${a.date}`;
    existing.set(key, a);
  });
  
  // Merge new assignments
  const merged = [...state.data.dispatchAssignments];
  
  assignments.forEach(assignment => {
    const key = `${assignment.dispatchItemId || assignment.dispatch_item_id}-${assignment.resourceType || assignment.resource_type}-${assignment.resourceId || assignment.resource_id}-${assignment.date}`;
    const existingIndex = merged.findIndex(a => {
      const aKey = `${a.dispatchItemId || a.dispatch_item_id}-${a.resourceType || a.resource_type}-${a.resourceId || a.resource_id}-${a.date}`;
      return aKey === key;
    });
    
    if (existingIndex >= 0) {
      merged[existingIndex] = assignment;
    } else {
      merged.push(assignment);
    }
  });
  
  // Dedupe by id
  const seen = new Set();
  const deduped = merged.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
  
  setState({
    data: {
      ...state.data,
      dispatchAssignments: deduped
    }
  });
}

/**
 * Remove dispatch assignment
 * @param {string|number} assignmentId - Assignment ID to remove
 */
export function removeDispatchAssignment(assignmentId) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      dispatchAssignments: state.data.dispatchAssignments.filter((a) => String(a.id) !== String(assignmentId))
    }
  });
}

/**
 * Set todos
 * @param {Array} todos - Todos array
 */
export function setTodos(todos) {
  setState({
    data: {
      ...getState().data,
      todos: todos || []
    }
  });
}

/**
 * Upsert todo (insert or update)
 * @param {object} todo - Todo object
 */
export function upsertTodo(todo) {
  const state = getState();
  const existingIndex = state.data.todos.findIndex(t => t.id === todo.id);
  
  if (existingIndex >= 0) {
    // Update existing
    setState({
      data: {
        ...state.data,
        todos: state.data.todos.map((t, i) => i === existingIndex ? todo : t)
      }
    });
  } else {
    // Add new
    setState({
      data: {
        ...state.data,
        todos: [...state.data.todos, todo]
      }
    });
  }
}

/**
 * Remove todo
 * @param {string|number} todoId - Todo ID to remove
 */
export function removeTodo(todoId) {
  const state = getState();
  setState({
    data: {
      ...state.data,
      todos: state.data.todos.filter(t => t.id !== todoId)
    }
  });
}

/**
 * Set resource context (Dock selection)
 * @param {string} context - Resource context ('WORKER' | 'VEHICLE' | 'DEVICE' | 'LOCATION' | 'DISPATCH')
 */
export function setResourceContext(context) {
  const validContexts = ['WORKER', 'VEHICLE', 'DEVICE', 'LOCATION', 'DISPATCH'];
  if (!validContexts.includes(context)) {
    console.warn(`Invalid resource context: ${context}`);
    return;
  }
  
  setState({
    ui: {
      ...getState().ui,
      resourceContext: context,
      resourceSidebarTab: context // Sync sidebar tab
    }
  });
}

/**
 * Set resource query (search filter)
 * @param {string} query - Search query string
 */
export function setResourceQuery(query) {
  setState({
    ui: {
      ...getState().ui,
      resourceQuery: query || ''
    }
  });
}

/**
 * Set unassigned panel query (search filter)
 * @param {string} query - Search query string
 */
export function setUnassignedQuery(query) {
  setState({
    ui: {
      ...getState().ui,
      unassignedQuery: query || ''
    }
  });
}

/**
 * Set selected resource
 * @param {string} type - Resource type ('LOCATION' | 'DISPATCH' | 'WORKER' | 'VEHICLE' | 'DEVICE')
 * @param {string|number|null} id - Resource ID or null to clear
 */
export function setSelectedResource(type, id) {
  const validTypes = ['LOCATION', 'DISPATCH', 'WORKER', 'VEHICLE', 'DEVICE'];
  if (!validTypes.includes(type)) {
    console.warn(`Invalid resource type: ${type}`);
    return;
  }
  
  setState({
    ui: {
      ...getState().ui,
      selectedResource: id ? { type, id: String(id) } : null,
      selectedDispatchItemId: type === 'DISPATCH' && id ? String(id) : null
    }
  });
}

/**
 * Clear selected resource
 */
export function clearSelectedResource() {
  setState({
    ui: {
      ...getState().ui,
      selectedResource: null,
      selectedDispatchItemId: null
    }
  });
}

/**
 * Set selected slot (Board: Zelle für Kontextpanel)
 * @param {{ assignmentId: string|number, date: string }|null} slot - { assignmentId, date } or null
 */
export function setSelectedSlot(slot) {
  setState({
    ui: {
      ...getState().ui,
      selectedSlot: slot
    }
  });
}

/**
 * Set day view mode
 * @param {string} mode - Day view mode ('timeline' | 'grid')
 */
export function setDayViewMode(mode) {
  const validModes = ['timeline', 'grid'];
  if (!validModes.includes(mode)) {
    console.warn(`Invalid day view mode: ${mode}`);
    return;
  }
  
  setState({
    ui: {
      ...getState().ui,
      dayViewMode: mode
    }
  });
}

