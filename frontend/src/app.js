// API Configuration
// Use local API if available (from localApi.js), otherwise use backend API
const API_BASE_URL = window.location.origin + '/backend/api';

// =====================================================
// TIME CALCULATION HELPERS (Single Source of Truth)
// =====================================================
/**
 * Parse HH:MM time string to minutes since midnight
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} Minutes since midnight (0-1439)
 */
function parseHHMMToMinutes(timeStr) {
  if (!timeStr) return 0;
  try {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  } catch (e) {
    console.warn('Invalid time format:', timeStr);
    return 0;
  }
}

/**
 * Calculate duration in minutes between two times, handling midnight crossover
 * @param {string} timeFrom - Start time in HH:MM format
 * @param {string} timeTo - End time in HH:MM format
 * @returns {number} Duration in minutes (handles overnight shifts)
 */
function durationMinutes(timeFrom, timeTo) {
  if (!timeFrom || !timeTo) return 0;
  const fromMinutes = parseHHMMToMinutes(timeFrom);
  const toMinutes = parseHHMMToMinutes(timeTo);
  
  if (toMinutes <= fromMinutes) {
    // Overnight shift: add 24 hours
    return (24 * 60 - fromMinutes) + toMinutes;
  }
  return toMinutes - fromMinutes;
}

/**
 * Calculate hours from time_from/time_to, handling midnight crossover
 * @param {string} timeFrom - Start time in HH:MM format
 * @param {string} timeTo - End time in HH:MM format
 * @returns {number} Hours (decimal, e.g. 2.5 for 2h30m)
 */
function calculateHoursFromTimes(timeFrom, timeTo) {
  const minutes = durationMinutes(timeFrom, timeTo);
  return minutes / 60;
}

/**
 * Get hours for a time entry (uses time_from/time_to if available, else entry.hours)
 * @param {object} entry - Time entry object
 * @returns {number} Hours (decimal)
 */
function getEntryHours(entry) {
  // Alias auf entryHours, damit es keine zweite Berechnungslogik gibt
  return entryHours(entry);
}

// =====================================================
// SINGLE SOURCE OF TRUTH: Entry Minutes/Hours Helpers
// =====================================================
/**
 * Calculate entry minutes from time_from/time_to (SINGLE SOURCE OF TRUTH)
 * @param {object} entry - Time entry with time_from and time_to
 * @returns {number} Minutes
 */
function entryMinutes(entry) {
  if (!entry.time_from || !entry.time_to) return 0;
  return durationMinutes(entry.time_from, entry.time_to);
}

/**
 * Calculate entry hours from time_from/time_to (SINGLE SOURCE OF TRUTH)
 * @param {object} entry - Time entry with time_from and time_to
 * @returns {number} Hours (decimal)
 */
function entryHours(entry) {
  return entryMinutes(entry) / 60;
}

/**
 * Group entries by category and calculate totals
 * @param {Array} entries - Array of time entries
 * @returns {Object} {category: totalHours}
 */
function groupByCategory(entries) {
  const grouped = {};
  entries.forEach(entry => {
    const category = entry.category || 'BUERO_ALLGEMEIN';
    if (!grouped[category]) {
      grouped[category] = 0;
    }
    grouped[category] += entryHours(entry);
  });
  return grouped;
}

// API Client Functions
// Use window.api if available (from localApi.js), otherwise create backend API client
// #region agent log
fetch('http://127.0.0.1:7242/ingest/74cef812-0f68-43eb-869d-7652e20dadd7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:105',message:'API initialization check',data:{windowApiExists:!!window.api,windowApiType:typeof window.api},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
const api = window.api || {
  // Generic request function
  async request(endpoint, options = {}) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/74cef812-0f68-43eb-869d-7652e20dadd7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:107',message:'Backend API request called',data:{endpoint:endpoint,usingBackendApi:true,windowApiExists:!!window.api},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const url = `${API_BASE_URL}/${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Add credentials if user is logged in (session-based)
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session
    };
    
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/74cef812-0f68-43eb-869d-7652e20dadd7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:127',message:'Fetching from backend',data:{url:url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await fetch(url, mergedOptions);
      
      // Try to parse JSON, but handle non-JSON responses
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response: ${response.status}`);
      }
      
      if (!response.ok) {
        const errorMsg = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`API Error (${response.status}):`, errorMsg);
        throw new Error(errorMsg);
      }
      
      return data;
    } catch (error) {
      console.error('API Request Error:', {
        endpoint,
        url,
        error: error.message,
        stack: error.stack
      });
      
      // Verbesserte Fehlermeldung für Netzwerkfehler
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        const friendlyError = new Error(
          'Verbindung zum Server fehlgeschlagen. Bitte überprüfen Sie:\n' +
          '1. Ob der Server auf http://localhost:8080 läuft\n' +
          '2. Ob PHP installiert ist\n' +
          '3. Ob die Datenbank erreichbar ist'
        );
        friendlyError.name = 'NetworkError';
        friendlyError.originalError = error;
        throw friendlyError;
      }
      
      throw error;
    }
  },
  
  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  // POST request
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  
  // PUT request
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  
  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
  
  // Auth endpoints
  async login(username, password) {
    return this.post('auth', { action: 'login', username, password });
  },
  
  async getCurrentUser() {
    return this.get('me');
  },
  
  // Data endpoints
  async getUsers() {
    return this.get('users');
  },
  
  async createUser(userData) {
    return this.post('users', userData);
  },
  
  async updateUser(userId, userData) {
    return this.put(`users/${userId}`, userData);
  },
  
  async deleteUser(userId) {
    return this.delete(`users/${userId}`);
  },
  
  async getWorkers() {
    return this.get('workers');
  },
  
  async createWorker(workerData) {
    return this.post('workers', workerData);
  },
  
  async updateWorker(workerId, workerData) {
    return this.put(`workers/${workerId}`, workerData);
  },
  
  async deleteWorker(workerId) {
    return this.delete(`workers/${workerId}`);
  },
  
  async getTeams() {
    return this.get('teams');
  },
  
  async createTeam(teamData) {
    return this.post('teams', teamData);
  },
  
  async updateTeam(teamId, teamData) {
    return this.put(`teams/${teamId}`, teamData);
  },
  
  async deleteTeam(teamId) {
    return this.delete(`teams/${teamId}`);
  },
  
  async getLocations() {
    return this.get('locations');
  },
  
  async createLocation(locationData) {
    return this.post('locations', locationData);
  },
  
  async updateLocation(locationId, locationData) {
    return this.put(`locations/${locationId}`, locationData);
  },
  
  async deleteLocation(locationId) {
    return this.delete(`locations/${locationId}`);
  },
  
  async getAssignments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`assignments${queryString ? '?' + queryString : ''}`);
  },
  
  async createAssignment(assignmentData) {
    return this.post('assignments', assignmentData);
  },
  
  async updateAssignment(assignmentId, assignmentData) {
    return this.put(`assignments/${assignmentId}`, assignmentData);
  },
  
  async deleteAssignment(assignmentId) {
    return this.delete(`assignments/${assignmentId}`);
  },
  
  // Week Planning endpoints
  async getWeekPlanning(workerId, week, year) {
    const params = new URLSearchParams({
      worker_id: workerId,
      week: week,
      year: year
    });
    return this.get(`week_planning?${params}`);
  },
  
  async saveWeekPlanning(weekData) {
    return this.post('week_planning', weekData);
  },
  
  // Time Entries endpoints
  async getTimeEntries(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`time_entries${queryString ? '?' + queryString : ''}`);
  },
  
  async createTimeEntry(entryData) {
    return this.post('time_entries', entryData);
  },
  
  async updateTimeEntry(entryId, entryData) {
    return this.put(`time_entries/${entryId}`, entryData);
  },
  
  async deleteTimeEntry(entryId) {
    return this.delete(`time_entries/${entryId}`);
  },
  
  async confirmTimeEntry(entryId) {
    return this.updateTimeEntry(entryId, { status: 'CONFIRMED' });
  },
  
  async rejectTimeEntry(entryId) {
    return this.updateTimeEntry(entryId, { status: 'REJECTED' });
  },
  
  async confirmDay(date) {
    return this.post('time_entries/confirm_day', { date: date });
  },
  
  async getAdminOverview(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`admin/overview/week${queryString ? '?' + queryString : ''}`);
  },
  // Consolidated getTimeEntriesSummary - supports both date range and single date
  async getTimeEntriesSummary(workerId, dateOrDateFrom, dateTo = null, summaryType = null) {
    const params = new URLSearchParams({
      worker_id: workerId
    });
    
    // If dateTo is provided, it's a date range (dateOrDateFrom = dateFrom)
    if (dateTo) {
      params.append('summary', '1');
      params.append('date_from', dateOrDateFrom);
      params.append('date_to', dateTo);
    } else {
      // Single date mode (dateOrDateFrom = date)
      params.append('date', dateOrDateFrom);
      params.append('summary', summaryType || 'day_week');
    }
    
    return this.get(`time_entries?${params}`);
  },
  
  async getTimeEntriesMonth(workerId, year, month) {
    const params = new URLSearchParams({
      worker_id: workerId,
      year: year,
      month: month,
      summary: 'day'
    });
    return this.get(`time_entries?${params}`);
  },
};

// Week Planning State
let weekPlanningState = {
  selectedWorkerId: null,
  selectedWeek: null,
  selectedYear: null,
  weekData: [],
  weekStart: null,
  weekEnd: null,
  hasUnsavedChanges: false
};

// =====================================================
// WORKFLOW LAYER: Single Source of Truth State
// =====================================================
const workflowState = {
  viewMode: 'day', // 'day' | 'week' | 'month' | 'year' | 'team'
  selectedDate: null, // 'YYYY-MM-DD'
  selectedWeekStart: null, // 'YYYY-MM-DD' (Monday)
  cache: {
    dayEntries: [],
    weekEntries: [],
    teamData: null
  }
};

const uiState = {
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
};

// =====================================================
// WORKFLOW LAYER: Central Data Loaders (Single Source of Truth: data.timeEntries)
// =====================================================
/**
 * Load day entries for a specific date (delegiert an loadTimeEntries).
 * Lädt immer den aktiven Kalender-User (getCalendarViewUserId) im Bereich [date,date].
 */
async function loadDayEntries(date, userId = null) {
  // Wir nutzen zentral loadTimeEntries; userId-Parameter wird aktuell nicht mehr separat ausgewertet,
  // da loadTimeEntries die Auswahl des Kalender-Users (Admin/Fremduser) bereits berücksichtigt.
  await loadTimeEntries(date, date);
}

/**
 * Load week entries (Monday to Sunday) – delegiert an loadTimeEntries.
 * Lädt den aktiven Kalender-User für die Woche [weekStart, weekStart+6].
 */
async function loadWeekEntries(weekStart, userId = null) {
  const monday = new Date(weekStart);
  if (isNaN(monday.getTime())) {
    return;
  }
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const dateFrom = weekStart;
  const dateTo = sunday.toISOString().split('T')[0];
  await loadTimeEntries(dateFrom, dateTo);
}

/**
 * Load team week data (admin only)
 * @param {string} weekStart - Monday date in YYYY-MM-DD format
 * @returns {Promise<Object>} {users: [], entries: []}
 */
async function loadTeamWeek(weekStart) {
  try {
    // Calculate Sunday
    const monday = new Date(weekStart);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    const dateFrom = weekStart;
    const dateTo = sunday.toISOString().split('T')[0];
    
    const response = await api.getAdminOverview({
      date_from: dateFrom,
      date_to: dateTo
    });
    
    if (response.ok && response.users && response.entries) {
      workflowState.cache.teamData = {
        users: response.users,
        entries: response.entries,
        date_from: dateFrom,
        date_to: dateTo
      };
      workflowState.selectedWeekStart = weekStart;
      return workflowState.cache.teamData;
    }
    workflowState.cache.teamData = { users: [], entries: [] };
    return workflowState.cache.teamData;
  } catch (error) {
    console.error('Error loading team week:', error);
    workflowState.cache.teamData = { users: [], entries: [] };
    return workflowState.cache.teamData;
  }
}

const data = {
  currentUser: null, // Will be set after login
  users: [
    {
      id: "user-admin",
      username: "admin",
      name: "Admin User",
      email: "admin@technoova.app",
      password: "010203",
      role: "Admin",
      permissions: ["Lesen", "Schreiben", "Verwalten", "manage_users", "plan", "view_all"],
      workerId: null, // Admin is not a worker
      firstLogin: false,
      lastLogin: "12.11.2025 08:15",
    },
    {
      id: "user-test1",
      username: "test1",
      name: "Test User",
      email: "test1@technoova.app",
      password: "010203",
      role: "Worker",
      permissions: ["Lesen", "view_own"],
      workerId: "worker-2", // Connected to Ivan Majanovic
      firstLogin: false,
      lastLogin: null,
    },
    // Auto-generated users from workers
    {
      id: "user-worker-2",
      username: "ivan.majanovic",
      name: "Ivan Majanovic",
      email: "ivan.majanovic@aftbau.ch",
      password: "010203",
      role: "Dispatcher", // Teamleiter with write access
      permissions: ["Lesen", "Schreiben", "view_own"],
      workerId: "worker-2",
      firstLogin: true,
      lastLogin: null,
    },
    {
      id: "user-worker-3",
      username: "josip.klaric",
      name: "Josip Klaric",
      email: "josip.klaric@aftbau.ch",
      password: "010203",
      role: "Worker",
      permissions: ["Lesen", "view_own"],
      workerId: "worker-3",
      firstLogin: true,
      lastLogin: null,
    },
    {
      id: "user-worker-4",
      username: "petra.meier",
      name: "Petra Meier",
      email: "petra.meier@elektro-meier.ch",
      password: "010203",
      role: "Worker",
      permissions: ["Lesen", "view_own"],
      workerId: "worker-4",
      firstLogin: true,
      lastLogin: null,
    },
  ],
  date: "Heute 14. November 2025",
  locations: [
    {
      id: "loc-1",
      code: "25-001 Stäfa, Etzelstrasse 32",
      address: "Etzelstrasse 32, 8712 Stäfa",
      description: "Geländermontage in einer Wohnung",
      crew: [
        { name: "AFT Bau", time: "06:30 - 15:30" },
        { name: "Ivan Majanovic", time: "06:30 - 15:30" },
        { name: "Josip Klaric", time: "06:30 - 15:30" }
      ],
      tags: [
        { icon: "📍", label: "Einsatzort" },
        { icon: "🚚", label: "LKW benötigt" }
      ],
      schedule: {
        status: "In Ausführung",
        start: "2025-11-14T06:30",
        end: "2025-11-14T15:30",
        deadline: "2025-11-17",
        progress: 65,
      },
      planFile: null, // Base64 string or URL to uploaded plan document
      planFileName: null // Original file name
    },
    {
      id: "loc-2",
      code: "25-002 Zürich, Hafenstrasse 11",
      address: "Hafenstrasse 11, 8005 Zürich",
      description: "Stahlkonstruktion Dach",
      crew: [
        { name: "Team Schweißen", time: "07:00 - 16:00" },
        { name: "Petra Meier", time: "08:00 - 16:00" }
      ],
      tags: [
        { icon: "🛠️", label: "Schweißen" },
        { icon: "⚠️", label: "Sicherheitsbriefing" }
      ],
      schedule: {
        status: "Geplant",
        start: "2025-11-15T07:00",
        end: "2025-11-15T16:00",
        deadline: "2025-11-20",
        progress: 30,
      },
      planFile: null, // Base64 string or URL to uploaded plan document
      planFileName: null // Original file name
    }
  ],
  teams: [
    {
      id: "team-1",
      name: "AFT Bau",
      type: "intern", // intern | extern
      company: "AFT Bau GmbH",
      description: "Montageteam für Geländermontage",
      contact: {
        phone: "+41 44 123 45 67",
        email: "leitstelle@aftbau.ch",
        address: "Musterstrasse 1, 8000 Zürich"
      },
      members: ["worker-1", "worker-2", "worker-3"],
      createdAt: "2025-01-15",
      isActive: true
    },
    {
      id: "team-2",
      name: "Elektro Meier",
      type: "extern",
      company: "Elektro Meier AG",
      description: "Externes Elektrik-Team",
      contact: {
        phone: "+41 44 555 88 99",
        email: "info@elektro-meier.ch",
        address: "Elektrostrasse 10, 8001 Zürich"
      },
      members: ["worker-4"],
      createdAt: "2025-02-01",
      isActive: true
    }
  ],
  workers: [
    {
      id: "worker-1",
      name: "AFT Bau",
      role: "Montageteam",
      company: "AFT Bau GmbH",
      teamId: "team-1",
      status: "Arbeitsbereit",
      contact: { phone: "+41 44 123 45 67", email: "leitstelle@aftbau.ch" },
      availability: [
        { day: "Montag", from: "06:30", to: "15:30", job: "Geländermontage", site: "Stäfa" },
        { day: "Dienstag", from: "06:30", to: "15:30", job: "Geländermontage", site: "Stäfa" }
      ]
    },
    {
      id: "worker-2",
      name: "Ivan Majanovic",
      role: "Monteur",
      company: "AFT Bau GmbH",
      status: "Arbeitsbereit",
      contact: { phone: "+41 79 555 12 34", email: "ivan.majanovic@aftbau.ch" },
      availability: [
        { day: "Montag", from: "06:30", to: "15:30", job: "Geländermontage", site: "Stäfa" },
        { day: "Mittwoch", from: "07:00", to: "14:00", job: "Lagerumbau", site: "Zürich" }
      ]
    },
    {
      id: "worker-3",
      name: "Josip Klaric",
      role: "Monteur",
      company: "AFT Bau GmbH",
      status: "Arbeitsbereit",
      contact: { phone: "+41 78 666 33 11", email: "josip.klaric@aftbau.ch" },
      availability: [
        { day: "Montag", from: "06:30", to: "15:30", job: "Geländermontage", site: "Stäfa" },
        { day: "Dienstag", from: "07:00", to: "13:00", job: "Transport Begleitung", site: "Hafenstrasse" }
      ]
    },
    {
      id: "worker-4",
      name: "Petra Meier",
      role: "Elektrikerin",
      company: "Elektro Meier AG",
      teamId: "team-2",
      status: "Urlaub",
      contact: { phone: "+41 79 888 44 22", email: "petra.meier@elektro-meier.ch" },
      availability: [
        { day: "Montag", from: "08:00", to: "16:00", job: "Stahlkonstruktion Dach", site: "Zürich Hafenstrasse" }
      ]
    },
    {
      id: "worker-5",
      name: "Team Zürich",
      role: "Team",
      company: "AFT Bau GmbH",
      status: "Arbeitsbereit",
      contact: { phone: "+41 44 987 65 43", email: "zuerich.team@aftbau.ch" },
      availability: [
        { day: "Montag", from: "07:00", to: "16:00", job: "Stahlkonstruktion Dach", site: "Zürich Hafenstrasse" },
        { day: "Dienstag", from: "07:00", to: "12:00", job: "Stahlkonstruktion Dach", site: "Zürich Hafenstrasse" }
      ]
    }
  ]
};

const ROLE_PRESETS = {
  Admin: {
    label: "Admin",
    permissions: ["Lesen", "Schreiben", "Verwalten"],
  },
  Dispatcher: {
    label: "Dispatcher",
    permissions: ["Lesen", "Schreiben"],
  },
  Viewer: {
    label: "Viewer",
    permissions: ["Lesen"],
  },
};

const ALL_PERMISSIONS = Array.from(
  new Set(
    Object.values(ROLE_PRESETS).flatMap((role) => role.permissions)
  )
);

function renderApp() {
  const app = document.getElementById("app");
  if (!app) {
    console.error("App root element not found");
    return;
  }
  
  // Check if user is authenticated
  if (!uiState.isAuthenticated) {
    renderLogin();
    return;
  }

  app.innerHTML = `
  <div class="app-shell">
      ${renderTopbar()}
      ${uiState.activeMode === "plan" ? renderPlanningShell() : renderManagementShell()}
      ${renderTimeEntryModal()}
      ${renderTimeEntryWizard()}
      ${renderEmployeeCalendarModal()}
      ${renderFooter()}
    </div>
  `;

  bindGlobalEventHandlers();
  attachFullscreenHandlers();
  
  // Attach wizard handlers if wizard is open
  if (timeEntryWizardState.isOpen) {
    attachTimeEntryWizardHandlers();
  }
}

function renderLogin() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <!-- Logo Section -->
        <div class="login-header">
          <div class="login-logo">
            <div class="brand__logo brand__logo--login">
              <div class="brand__logo-icon brand__logo-icon--login">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              </div>
              <div class="brand__logo-text brand__logo-text--login">technova</div>
            </div>
          </div>
          <h1 class="login-title">Willkommen zurück</h1>
          <p class="login-subtitle">Melde dich an, um fortzufahren</p>
        </div>
        
        <!-- Login Form Section -->
        <form id="login-form" class="login-form">
          <div class="form-group">
            <label for="username" class="form-label">Benutzername</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              class="form-input" 
              placeholder="Benutzername eingeben" 
              required 
              autocomplete="username"
            />
          </div>
          <div class="form-group">
            <label for="password" class="form-label">Passwort</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              class="form-input" 
              placeholder="Passwort eingeben" 
              required 
              autocomplete="current-password"
            />
          </div>
          <div id="login-error" class="login-error" style="display: none;"></div>
          <button type="submit" class="login-button">
            <span>Anmelden</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
      
      <!-- Footer -->
      <footer class="app-footer app-footer--login">
        <div class="app-footer__content">
          <span class="app-footer__text">Powered by</span>
          <div class="app-footer__brand">
            <div class="app-footer__logo">techloom</div>
            <div class="app-footer__tagline">Vernetzen | Optimieren | Wachsen!</div>
          </div>
        </div>
      </footer>
    </div>
  `;
  
  attachLoginHandlers();
}

function attachLoginHandlers() {
  const loginForm = document.getElementById("login-form");
  const errorDiv = document.getElementById("login-error");
  
  if (!loginForm) return;
  
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    
    // Disable form while logging in
    const submitBtn = loginForm.querySelector("button[type='submit']");
    const originalText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Anmelden...";
    }
    errorDiv.style.display = "none";
    
    try {
      // Use API login
      const result = await loginWithAPI(username, password);
      
      if (!result.success) {
        errorDiv.textContent = result.error || "Ungültiger Benutzername oder Passwort";
        errorDiv.style.display = "block";
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
        return;
      }
      
      const user = result.user;
      
      // Check if first login - show password change modal
      if (user.first_login === true || user.firstLogin === true) {
        openPasswordChangeModal(true);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
        return;
      }
      
      // If user is not admin, set active view to calendar
      if (!user.permissions.includes("view_all")) {
        uiState.activeView = "calendar";
        uiState.activeMode = "plan";
      }
      
      // Re-render app
      renderApp();
    } catch (error) {
      console.error('Login error:', error);
      
      // Aussagekräftigere Fehlermeldung
      let errorMessage = "Fehler beim Anmelden. Bitte versuchen Sie es erneut.";
      
      if (error.message && error.message.includes('Verbindung zum Server')) {
        errorMessage = error.message.replace(/\n/g, '<br>');
      } else if (error.message === 'Failed to fetch' || error.name === 'NetworkError' || error.name === 'TypeError') {
        errorMessage = "Verbindung zum Server fehlgeschlagen. Bitte starten Sie den Server mit 'node server.js' und überprüfen Sie, ob PHP installiert ist.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      errorDiv.innerHTML = errorMessage; // Verwende innerHTML für <br> Tags
      errorDiv.style.display = "block";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

async function logout() {
  try {
    // Call logout API endpoint
    await api.post('auth', { action: 'logout' });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  uiState.isAuthenticated = false;
  uiState.currentUserId = null;
  data.currentUser = null;
  
  // Clear data
  data.users = [];
  data.workers = [];
  data.teams = [];
  data.locations = [];
  
  renderApp();
}

// Helper function to generate username from name (name.nachname)
function generateUsername(name) {
  const parts = name.trim().toLowerCase().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[parts.length - 1]}`;
  }
  return parts[0];
}

function openPasswordChangeModal(isFirstLogin = false) {
  const modalRoot = document.getElementById("modal-root");
  modalRoot.innerHTML = `
    <div class="modal-overlay" id="password-change-modal">
      <div class="modal modal--password-change">
        <div class="modal__header">
          <h2>${isFirstLogin ? "Passwort ändern erforderlich" : "Passwort ändern"}</h2>
          ${!isFirstLogin ? `<button class="modal__close" id="close-password-modal">✕</button>` : ""}
        </div>
        <div class="modal__body">
          ${isFirstLogin ? `
            <div class="password-change-info">
              <p>Willkommen! Aus Sicherheitsgründen müssen Sie Ihr Passwort beim ersten Login ändern.</p>
            </div>
          ` : ""}
          <form id="password-change-form">
            ${!isFirstLogin ? `
              <div class="form-group">
                <label for="current-password" class="form-label">Aktuelles Passwort</label>
                <input 
                  type="password" 
                  id="current-password" 
                  name="current-password" 
                  class="form-input" 
                  placeholder="Aktuelles Passwort eingeben" 
                  required
                />
              </div>
            ` : ""}
            <div class="form-group">
              <label for="new-password" class="form-label">Neues Passwort</label>
              <input 
                type="password" 
                id="new-password" 
                name="new-password" 
                class="form-input" 
                placeholder="Neues Passwort eingeben" 
                required
                minlength="6"
              />
            </div>
            <div class="form-group">
              <label for="confirm-password" class="form-label">Passwort bestätigen</label>
              <input 
                type="password" 
                id="confirm-password" 
                name="confirm-password" 
                class="form-input" 
                placeholder="Passwort wiederholen" 
                required
                minlength="6"
              />
            </div>
            <div id="password-error" class="login-error" style="display: none;"></div>
          </form>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--secondary" id="cancel-password-change" ${isFirstLogin ? "style='display:none;'" : ""}>Abbrechen</button>
          <button type="button" class="btn btn--primary" id="submit-password-change">Passwort ändern</button>
        </div>
      </div>
    </div>
  `;
  
  const closeBtn = document.getElementById("close-password-modal");
  const cancelBtn = document.getElementById("cancel-password-change");
  const submitBtn = document.getElementById("submit-password-change");
  const errorDiv = document.getElementById("password-error");
  const modal = document.getElementById("password-change-modal");
  
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modalRoot.innerHTML = "";
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      modalRoot.innerHTML = "";
    });
  }
  
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal && !isFirstLogin) {
        modalRoot.innerHTML = "";
      }
    });
  }
  
  submitBtn.addEventListener("click", async () => {
    const currentPassword = document.getElementById("current-password")?.value || "";
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    
    // Validation
    if (!isFirstLogin && data.currentUser.password !== currentPassword) {
      errorDiv.textContent = "Aktuelles Passwort ist falsch";
      errorDiv.style.display = "block";
      return;
    }
    
    if (newPassword.length < 6) {
      errorDiv.textContent = "Das Passwort muss mindestens 6 Zeichen lang sein";
      errorDiv.style.display = "block";
      return;
    }
    
    if (newPassword !== confirmPassword) {
      errorDiv.textContent = "Die Passwörter stimmen nicht überein";
      errorDiv.style.display = "block";
      return;
    }
    
    // Update password via API
    const updatedUser = { ...data.currentUser, password: newPassword, firstLogin: false };
    const userResult = await saveUserToAPI(updatedUser);
    if (userResult.success) {
      // Update local currentUser
      data.currentUser.password = newPassword;
      data.currentUser.firstLogin = false;
      // Reload users from API
      await loadAllData();
    }
    
    // Close modal and continue
    modalRoot.innerHTML = "";
    
    // If user is not admin, set active view to calendar
    if (!data.currentUser.permissions.includes("view_all")) {
      uiState.activeView = "calendar";
      uiState.activeMode = "plan";
    }
    
    // Re-render app
    renderApp();
  });
}

function openAdminPasswordChangeModal(userId) {
  const user = data.users.find(u => u.id === userId);
  if (!user) return;
  
  const modalRoot = document.getElementById("modal-root");
  modalRoot.innerHTML = `
    <div class="modal-overlay" id="admin-password-change-modal">
      <div class="modal modal--password-change">
        <div class="modal__header">
          <h2>Passwort ändern für ${user.name}</h2>
          <button class="modal__close" id="close-admin-password-modal">✕</button>
        </div>
        <div class="modal__body">
          <div class="password-change-info">
            <p>Als Administrator können Sie das Passwort für diesen Benutzer ändern.</p>
          </div>
          <form id="admin-password-change-form">
            <div class="form-group">
              <label for="admin-new-password" class="form-label">Neues Passwort</label>
              <input 
                type="password" 
                id="admin-new-password" 
                name="admin-new-password" 
                class="form-input" 
                placeholder="Neues Passwort eingeben" 
                required
                minlength="6"
              />
            </div>
            <div class="form-group">
              <label for="admin-confirm-password" class="form-label">Passwort bestätigen</label>
              <input 
                type="password" 
                id="admin-confirm-password" 
                name="admin-confirm-password" 
                class="form-input" 
                placeholder="Passwort wiederholen" 
                required
                minlength="6"
              />
            </div>
            <div id="admin-password-error" class="login-error" style="display: none;"></div>
          </form>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--secondary" id="cancel-admin-password-change">Abbrechen</button>
          <button type="button" class="btn btn--primary" id="submit-admin-password-change">Passwort ändern</button>
        </div>
      </div>
    </div>
  `;
  
  const closeBtn = document.getElementById("close-admin-password-modal");
  const cancelBtn = document.getElementById("cancel-admin-password-change");
  const submitBtn = document.getElementById("submit-admin-password-change");
  const errorDiv = document.getElementById("admin-password-error");
  const modal = document.getElementById("admin-password-change-modal");
  
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modalRoot.innerHTML = "";
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      modalRoot.innerHTML = "";
    });
  }
  
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modalRoot.innerHTML = "";
      }
    });
  }
  
  submitBtn.addEventListener("click", () => {
    const newPassword = document.getElementById("admin-new-password").value;
    const confirmPassword = document.getElementById("admin-confirm-password").value;
    
    // Validation
    if (newPassword.length < 6) {
      errorDiv.textContent = "Das Passwort muss mindestens 6 Zeichen lang sein";
      errorDiv.style.display = "block";
      return;
    }
    
    if (newPassword !== confirmPassword) {
      errorDiv.textContent = "Die Passwörter stimmen nicht überein";
      errorDiv.style.display = "block";
      return;
    }
    
    // Update password
    user.password = newPassword;
    user.firstLogin = true; // Force password change on next login
    
    // Close modal
    modalRoot.innerHTML = "";
    
    // Re-render app to show updated user list
    renderApp();
  });
}

function getCurrentDate() {
  const now = new Date();
  const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const dayName = dayNames[now.getDay()];
  const day = now.getDate();
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  return `${dayName}, ${day}. ${month} ${year}`;
}

function renderTopbar() {
  if (!data.currentUser) return "";
  
  const manageAllowed = data.currentUser.permissions && data.currentUser.permissions.includes("manage_users");
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand__logo">
          <div class="brand__logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
        </div>
          <div class="brand__logo-text">technova</div>
        </div>
        <div class="nav-tabs">
          <button class="${uiState.activeMode === "plan" ? "active" : ""}" data-mode="plan">Planen</button>
          ${
            manageAllowed
              ? `<button class="${uiState.activeMode === "manage" ? "active" : ""}" data-mode="manage">Verwalten</button>`
              : ""
          }
        </div>
      </div>
      <div class="topbar__actions">
        <button class="btn-fullscreen" id="btn-fullscreen" title="Vollbildmodus">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="topbar__date">
          ${getCurrentDate()}
        </div>
        <div class="user-chip" id="user-chip-menu">
          <div class="user-chip__avatar">
            ${data.currentUser.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
          </div>
          <div class="user-chip__info">
            <span class="user-chip__name">${data.currentUser.name}</span>
            <span class="user-chip__role">${data.currentUser.role}</span>
          </div>
          <svg class="user-chip__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="user-menu" id="user-menu" style="display: none;">
            <div class="user-menu__info">
              <div class="user-menu__avatar">
                ${data.currentUser.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
              </div>
              <div class="user-menu__details">
                <div class="user-menu__name">${data.currentUser.name}</div>
                <div class="user-menu__role">${data.currentUser.role}</div>
                ${data.currentUser.email ? `<div class="user-menu__email">${data.currentUser.email}</div>` : ""}
              </div>
            </div>
            <div class="user-menu__divider"></div>
            <button class="user-menu__item" id="btn-logout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="app-footer">
      <div class="app-footer__content">
        <span class="app-footer__text">Powered by</span>
        <div class="app-footer__brand">
          <div class="app-footer__logo">techloom</div>
          <div class="app-footer__tagline">Vernetzen | Optimieren | Wachsen!</div>
        </div>
      </div>
    </footer>
  `;
}

// Helper function to filter out teams from workers
function filterIndividualWorkers(workers) {
  const teamNames = new Set(data.teams.map(t => t.name));
  return workers.filter((worker) => {
    // Exclude if role is Team or Montageteam
    if (worker.role === "Team" || worker.role === "Montageteam") {
      return false;
    }
    // Exclude if name matches a team name
    if (teamNames.has(worker.name)) {
      return false;
    }
    return true;
  });
}

function renderPlanningShell() {
  const showSidebar = false; // Sidebar immer ausblenden
  const viewAll = data.currentUser && data.currentUser.permissions && data.currentUser.permissions.includes("view_all");
  
  // Filter workers based on permissions and exclude teams
  let workersToShow = data.workers.filter((worker) => worker.status === "Arbeitsbereit");
  workersToShow = filterIndividualWorkers(workersToShow);
  if (!viewAll && data.currentUser && data.currentUser.workerId) {
    workersToShow = workersToShow.filter(w => w.id === data.currentUser.workerId);
  }
  
  // Filter locations based on permissions
  let locationsToShow = data.locations;
  if (!viewAll && data.currentUser && data.currentUser.workerId) {
    const worker = data.workers.find(w => w.id === data.currentUser.workerId);
    if (worker) {
      const workerLocations = new Set();
      worker.availability.forEach(slot => {
        const loc = data.locations.find(l => l.address === slot.site || l.code === slot.site);
        if (loc) workerLocations.add(loc.id);
      });
      locationsToShow = data.locations.filter(l => workerLocations.has(l.id));
    } else {
      locationsToShow = [];
    }
  }
  
  return `
    <div class="main ${showSidebar ? "" : "main--no-sidebar"}">
      ${showSidebar ? `
      <aside class="sidebar">
        <div>
          <div class="sidebar__search">
            <input placeholder="Suche…" />
          </div>
        </div>
        ${viewAll ? `
        <div>
          <div class="sidebar__section-title">Teams</div>
          <div class="sidebar__list sidebar__list--teams">
            ${data.teams.filter(team => team.isActive && team.members && team.members.length > 0).map((team) => {
              const teamWorkers = data.workers.filter(w => team.members.includes(w.id));
              const initials = team.name.split(" ").map((n) => n[0]).join("").substring(0, 2) || "TM";
              return `
                <div class="team-card" data-team-id="${team.id}" draggable="true" title="Team ${team.name} - ${teamWorkers.length} Mitglieder">
                  <div class="team-card__avatar">
                    ${initials}
                  </div>
                  <div class="team-card__info">
                    <span class="team-card__name">${team.name}</span>
                    <span class="team-card__meta">
                      <span class="team-card__type">${team.type === "intern" ? "Intern" : "Extern"}</span>
                      <span class="team-card__count">${teamWorkers.length} Mitglieder</span>
                    </span>
                  </div>
                </div>
              `;
            }).join("")}
            ${data.teams.filter(team => team.isActive && team.members && team.members.length > 0).length === 0 ? `
              <div class="sidebar__empty-hint">Keine Teams vorhanden</div>
            ` : ""}
          </div>
        </div>
        
        <div>
          <div class="sidebar__section-title">Personal</div>
          <div class="sidebar__list">
            ${workersToShow
              .map(
                (worker) => `
                  <div class="person-card" data-worker-id="${worker.id}">
                    <div class="person-card__avatar">
                      ${worker.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div class="person-card__info">
                      <span>${worker.name}</span>
                      <span>${worker.role}</span>
                      <span style="font-size:11px;color:#3ecf8e;">
                        ${worker.status}
                      </span>
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
        ` : ""}
        ${data.currentUser && data.currentUser.workerId && uiState.activeView === "calendar" ? `
        <div>
          <div class="sidebar__section-title">Zeiterfassung</div>
          ${renderTimeSummarySidebar()}
        </div>
        ` : ""}
        <div>
          <div class="sidebar__section-title">Baustellen</div>
          <div class="sidebar__list sidebar__list--locations">
            ${locationsToShow.length > 0 ? locationsToShow.map((location) => `
              <div class="location-card ${uiState.selectedLocationId === location.id ? "location-card--selected" : ""}" 
                   data-location-id="${location.id}">
                <div class="location-card__icon">📍</div>
                <div class="location-card__info">
                  <div class="location-card__code">${location.code || "—"}</div>
                  <div class="location-card__address">${location.address || "—"}</div>
                </div>
              </div>
            `).join("") : `
              <div class="location-hint">Keine Baustellen verfügbar</div>
            `}
          </div>
        </div>
      </aside>
      ` : ""}
      <main class="content">
        <div class="content__toolbar">
          <div class="content__tabs">
            <!-- Dashboards (Mitarbeiter/Teams/Baustellen) entfernt: Fokus nur noch auf Kalender -->
            <button class="${uiState.activeView === "calendar" ? "active" : ""}" data-view="calendar">Kalender</button>
          </div>
          ${uiState.activeView === "calendar" ? `
            <div class="calendar-view-mode-switcher">
              <button class="view-mode-btn ${uiState.calendarViewMode === "year" ? "active" : ""}" data-view-mode="year" title="Jahresansicht">📆 Jahr</button>
              <button class="view-mode-btn ${uiState.calendarViewMode === "month" ? "active" : ""}" data-view-mode="month" title="Monatsansicht">📅 Monat</button>
              <button class="view-mode-btn ${uiState.calendarViewMode === "week" ? "active" : ""}" data-view-mode="week" title="Wochenansicht (Zeiterfassung)">📆 Woche</button>
              <button class="view-mode-btn ${uiState.calendarViewMode === "day" ? "active" : ""}" data-view-mode="day" title="Tagesansicht">📋 Tag</button>
            </div>
            ${viewAll ? `
              <button class="btn-secondary btn-team-calendar-header" id="btn-team-calendar-header" title="Teamkalender anzeigen" data-action="open-team-calendar">
                <span class="btn-icon">👥</span>
                <span class="btn-text">Teamkalender</span>
              </button>
            ` : ''}
            ${viewAll && uiState.calendarViewUserId ? `
              <div class="calendar-view-indicator">
                <span class="view-indicator-label">Ansicht:</span>
                <span class="view-indicator-name">${data.users.find(u => u.id === uiState.calendarViewUserId)?.name || 'Unbekannt'}</span>
                <button class="btn-link btn-reset-view" data-action="reset-calendar-view" title="Zurück zu meinem Kalender">✕</button>
              </div>
            ` : ''}
            <button class="btn-primary btn-add-time-entry-header" id="btn-add-time-entry-header" title="Zeit erfassen">
              <span class="btn-icon">+</span>
              <span class="btn-text">Zeit erfassen</span>
            </button>
          ` : ""}
        </div>
        ${renderActiveView()}
      </main>
    </div>
  `;
}

function renderManagementShell() {
  if (!data.currentUser || !data.currentUser.permissions) return "";
  
  const manageAllowed = data.currentUser.permissions.includes("manage_users");
  if (!manageAllowed) {
    return `
      <main class="management">
        <section class="management__panel">
          <h2>Keine Berechtigung</h2>
          <p>Nur Administratoren können auf die Benutzerverwaltung zugreifen.</p>
        </section>
      </main>
    `;
  }

  return `
    <main class="management">
      <section class="management__panel">
        <div class="management__panel-header">
          <div>
            <h2>Benutzerverwaltung</h2>
            <p>Rollen vergeben, Berechtigungen anpassen und Accounts verwalten.</p>
          </div>
          <div class="management__actions">
            <button class="add-button" id="btn-add-worker">+ Personal hinzufügen</button>
          </div>
        </div>
        <div class="management__summary">
          ${renderRoleSummary()}
        </div>
        <table class="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rolle</th>
              <th>Berechtigungen</th>
              <th>Letzter Login</th>
            </tr>
          </thead>
          <tbody>
            ${data.users.map(renderUserRow).join("")}
          </tbody>
        </table>
      </section>
      
      <section class="management__panel">
        <div class="management__panel-header">
          <div>
            <h2>Teamverwaltung</h2>
            <p>Teams erstellen, externe Firmen verwalten und Mitglieder zuweisen.</p>
          </div>
          <div class="management__actions">
            <button class="add-button add-button--secondary" id="btn-add-team">+ Team erstellen</button>
          </div>
        </div>
        <div class="teams-grid">
          ${data.teams.map((team) => {
            const members = team.members.map(id => data.workers.find(w => w.id === id)).filter(Boolean);
            const typeBadge = team.type === "extern" ? "extern" : "intern";
            const typeLabel = team.type === "extern" ? "Extern" : "Intern";
            return `
              <div class="team-management-card" data-team-id="${team.id}">
                <div class="team-management-card__header">
                  <div class="team-management-card__title-group">
                    <div class="team-management-card__name">${team.name}</div>
                    <div class="team-management-card__company">${team.company}</div>
                  </div>
                  <div class="team-management-card__badge team-type--${typeBadge}">${typeLabel}</div>
                </div>
                ${team.description ? `
                  <div class="team-management-card__description">${team.description}</div>
                ` : ""}
                <div class="team-management-card__contact">
                  <div class="contact-item">📞 ${team.contact.phone}</div>
                  <div class="contact-item">✉️ ${team.contact.email}</div>
                  ${team.contact.address ? `<div class="contact-item">📍 ${team.contact.address}</div>` : ""}
                </div>
                <div class="team-management-card__members">
                  <div class="members-header">
                    <span class="members-icon">👥</span>
                    <span class="members-label">Mitglieder (${members.length})</span>
                  </div>
                  <div class="members-list">
                    ${members.length > 0 ? members.map(worker => `
                      <div class="member-item">
                        <div class="member-avatar-small">${worker.name.split(" ").map(n => n[0]).join("")}</div>
                        <div class="member-details">
                          <div class="member-name-small">${worker.name}</div>
                          <div class="member-role-small">${worker.role}</div>
                        </div>
                      </div>
                    `).join("") : `
                      <div class="empty-members">Noch keine Mitglieder</div>
                    `}
                  </div>
                </div>
                <div class="team-management-card__actions">
                  <button class="btn btn--ghost btn--small" data-edit-team="${team.id}">Bearbeiten</button>
                </div>
              </div>
            `;
          }).join("")}
          ${data.teams.length === 0 ? `
            <div class="empty-teams-state">
              <div class="empty-teams-icon">👥</div>
              <div class="empty-teams-text">Noch keine Teams erstellt</div>
              <div class="empty-teams-hint">Erstellen Sie ein Team, um Mitarbeiter zu gruppieren</div>
            </div>
          ` : ""}
        </div>
      </section>
      
      <section class="management__panel">
        <div class="management__panel-header">
          <div>
            <h2>Baustellenverwaltung</h2>
            <p>Alle Einsatzorte überwachen und neue Baustellen anlegen.</p>
          </div>
          <div class="management__actions">
            <button class="add-button add-button--secondary" id="btn-add-location">+ Einsatzort hinzufügen</button>
          </div>
        </div>
        <div class="board board--management">
          ${data.locations.map((loc) => renderLocationCard(loc, { showEdit: true })).join("")}
        </div>
      </section>
      
      <!-- PHASE 7: Clean Start Button (Admin only, hidden by default) -->
      <section class="management__panel" style="border-top: 2px dashed #ccc; margin-top: 2rem; padding-top: 1rem;">
        <div class="management__panel-header">
          <div>
            <h2 style="color: #999; font-size: 0.9rem;">Wartung</h2>
            <p style="color: #999; font-size: 0.85rem;">Interne Tools für Systemwartung</p>
          </div>
        </div>
        <div style="padding: 1rem;">
          <button class="btn-secondary" data-action="cleanup-planned" style="background: #ff6b6b; color: white;">
            🗑️ Alle PLANNED Einträge löschen
          </button>
          <p style="font-size: 0.8rem; color: #999; margin-top: 0.5rem;">
            Löscht alle geplanten (nicht bestätigten) Zeiteinträge. Vorsicht: Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>
      </section>
    </main>
  `;
}

function renderRoleSummary() {
  const counts = data.users.reduce(
    (acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    },
    { Admin: 0, Dispatcher: 0, Viewer: 0 }
  );
  return `
    <div class="summary-card">
      <span class="summary-card__label">Admins</span>
      <span class="summary-card__value">${counts.Admin || 0}</span>
    </div>
    <div class="summary-card">
      <span class="summary-card__label">Dispatcher</span>
      <span class="summary-card__value">${counts.Dispatcher || 0}</span>
    </div>
    <div class="summary-card">
      <span class="summary-card__label">Viewer</span>
      <span class="summary-card__value">${counts.Viewer || 0}</span>
    </div>
  `;
}

function renderUserRow(user) {
  const isSelf = data.currentUser && user.email === data.currentUser.email;
  return `
    <tr data-user="${user.id}">
      <td>
        <div class="user-cell">
          <div class="user-avatar">${user.name
            .split(" ")
            .map((n) => n[0])
            .join("")}</div>
          <div>
            <div class="user-name">${user.name}</div>
            <div class="user-email">${user.email}</div>
          </div>
        </div>
      </td>
      <td>
        <select class="select role-select" data-role-select="${user.id}" ${isSelf ? "disabled" : ""}>
          ${Object.keys(ROLE_PRESETS)
            .map(
              (role) => `
              <option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>
            `
            )
            .join("")}
        </select>
        ${renderRoleBadge(user.role)}
      </td>
      <td>
        <div class="permission-chips">
          ${ALL_PERMISSIONS.map((perm) => {
            const checked = user.permissions.includes(perm);
            const disabled = user.role === "Viewer" && perm !== "Lesen";
            return `
              <label class="permission-chip">
                <input type="checkbox" data-permission-toggle="${user.id}" value="${perm}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}/>
                <span>${perm}</span>
              </label>
            `;
          }).join("")}
        </div>
      </td>
      <td>
        <div class="user-last-login">${user.lastLogin ? formatLastLogin(user.lastLogin) : "<span style='color: var(--text-muted);'>—</span>"}</div>
        <div class="user-actions">
          <button class="link-button" data-edit-user="${user.id}">Bearbeiten</button>
          <button class="link-button link-button--password" data-change-password="${user.id}" title="Passwort für ${user.name} ändern">🔒 Passwort</button>
        </div>
      </td>
    </tr>
  `;
}

function renderRoleBadge(role) {
  const colors = {
    Admin: "rgba(255, 149, 5, 0.15)",
    Dispatcher: "rgba(31, 122, 236, 0.15)",
    Viewer: "rgba(110, 118, 129, 0.15)",
  };
  return `<span class="role-badge" style="background:${colors[role] || "rgba(31,122,236,0.12)"};">${role}</span>`;
}

// View switch handler (event delegation)
function handleViewSwitch(e) {
  const btn = e.target.closest('[data-view]');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    const view = btn.getAttribute("data-view");
    if (view) {
      console.log('Switching view to:', view);
      uiState.activeView = view;
      renderApp();
    }
  }
}

// Event delegation for global handlers (bound once, not on every render)
let globalHandlersBound = false;

function bindGlobalEventHandlers() {
  // Only bind once using event delegation
  if (globalHandlersBound) return;
  globalHandlersBound = true;
  
  // Mode switching via event delegation
  document.addEventListener("click", (e) => {
    const modeBtn = e.target.closest("[data-mode]");
    if (modeBtn) {
      const mode = modeBtn.getAttribute("data-mode");
      if (mode && uiState.activeMode !== mode) {
        uiState.activeMode = mode;
        // Reset view when switching
        if (mode === "plan") {
          uiState.activeView = "calendar";
        }
        renderApp();
      }
    }
  });

  if (uiState.activeMode === "plan") {
    bindPlanningHandlers();
  } else {
    bindManagementHandlers();
  }
}

// Generic factory function for calendar drag-and-drop handlers
function createCalendarDragDropHandler(options) {
  const {
    selector,
    highlightRangeFn,
    assignFn,
    supportsTeams = false,
    supportsLocation = false,
    dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
    getTargetWorkerId = (cell) => cell.getAttribute("data-worker-id"),
    getDay = (cell) => cell.getAttribute("data-day"),
    getLocationId = (cell) => cell.getAttribute("data-location-id"),
    getDayIndex = (cell) => parseInt(cell.getAttribute("data-day-index") || "0"),
    clearDragStateFn = () => {}
  } = options;
  
  // Use event delegation - bind once to document
  return function bindHandler() {
    // Dragenter
    document.addEventListener("dragenter", (e) => {
      const cell = e.target.closest(selector);
      if (!cell) return;
      
      const hasDrag = supportsTeams ? (uiState.draggedWorkerId || uiState.draggedTeamId) : uiState.draggedWorkerId;
      if (!hasDrag) return;
      
      e.preventDefault();
      cell.classList.add("drop-target");
      if (!uiState.dragStartCell) {
        uiState.dragStartCell = cell;
      }
      uiState.dragEndCell = cell;
      if (highlightRangeFn) highlightRangeFn();
    }, true);
    
    // Dragover
    document.addEventListener("dragover", (e) => {
      const cell = e.target.closest(selector);
      if (!cell) return;
      
      const hasDrag = supportsTeams ? (uiState.draggedWorkerId || uiState.draggedTeamId) : uiState.draggedWorkerId;
      if (!hasDrag) return;
      
      e.preventDefault();
      if (cell !== uiState.dragEndCell) {
        if (uiState.dragEndCell) {
          uiState.dragEndCell.classList.remove("drop-target", "drop-range");
        }
        uiState.dragEndCell = cell;
        cell.classList.add("drop-target");
        if (highlightRangeFn) highlightRangeFn();
      }
    }, true);
    
    // Drop
    document.addEventListener("drop", async (e) => {
      const cell = e.target.closest(selector);
      if (!cell) return;
      
      e.preventDefault();
      
      if (supportsTeams && uiState.draggedTeamId) {
        // Team assignment logic (only for overview)
        if (!uiState.dragStartCell) return;
        
        const startLocationId = getLocationId(uiState.dragStartCell);
        const startDayIndex = getDayIndex(uiState.dragStartCell);
        const endCell = uiState.dragEndCell || uiState.dragStartCell;
        const endLocationId = getLocationId(endCell);
        const endDayIndex = getDayIndex(endCell);
        
        const selectedCells = [];
        if (startLocationId === endLocationId) {
          const startIdx = Math.min(startDayIndex, endDayIndex);
          const endIdx = Math.max(startDayIndex, endDayIndex);
          for (let i = startIdx; i <= endIdx; i++) {
            const day = dayNames[i];
            const cellForDay = document.querySelector(`${selector}[data-location-id="${startLocationId}"][data-day="${day}"]`);
            if (cellForDay) selectedCells.push(cellForDay);
          }
        } else {
          selectedCells.push(uiState.dragStartCell, endCell);
        }
        
        if (selectedCells.length > 0 && assignFn) {
          await assignFn(uiState.draggedTeamId, selectedCells);
        }
        
        clearDragStateFn();
        renderApp();
        return;
      }
      
      // Worker assignment
      if (!uiState.draggedWorkerId || !uiState.dragStartCell) return;
      
      const targetWorkerId = getTargetWorkerId(uiState.dragStartCell);
      const startDay = getDay(uiState.dragStartCell);
      const endCell = uiState.dragEndCell || uiState.dragStartCell;
      const endDay = getDay(endCell);
      
      const startIdx = dayNames.indexOf(startDay);
      const endIdx = dayNames.indexOf(endDay);
      const selectedDays = [];
      
      if (startIdx <= endIdx) {
        for (let i = startIdx; i <= endIdx; i++) {
          selectedDays.push(dayNames[i]);
        }
      } else {
        for (let i = endIdx; i <= startIdx; i++) {
          selectedDays.push(dayNames[i]);
        }
      }
      
      // Call assignment function
      if (assignFn) {
        if (supportsLocation) {
          const selectedLocationId = uiState.selectedLocationId || null;
          const location = selectedLocationId ? data.locations.find((l) => l.id === selectedLocationId) : null;
          const draggedWorker = data.workers.find((w) => w.id === uiState.draggedWorkerId);
          if (draggedWorker && location) {
            selectedDays.forEach((day) => {
              assignWorkerToCalendarDayWithLocation(targetWorkerId, uiState.draggedWorkerId, day, location);
            });
          } else {
            selectedDays.forEach((day) => {
              assignWorkerToCalendarDay(targetWorkerId, uiState.draggedWorkerId, day);
            });
          }
        } else {
          selectedDays.forEach((day) => {
            assignWorkerToCalendarDay(targetWorkerId, uiState.draggedWorkerId, day);
          });
        }
      }
      
      // Reset drag state
      document.querySelectorAll(selector).forEach((c) => c.classList.remove("drop-target", "drop-range"));
      uiState.draggedWorkerId = null;
      uiState.draggedTeamId = null;
      uiState.dragStartCell = null;
      uiState.dragEndCell = null;
      if (supportsLocation) uiState.selectedLocationId = null;
      clearDragStateFn();
      renderApp();
    }, true);
  };
}

// Bound handlers tracking
let planningHandlersBound = false;
let calendarDragDropHandlersBound = false;

function bindPlanningHandlers() {
  // Enable drop on job cards for assigning workers (in overview)
  attachDragDropHandlers(".job-card", {
    onDrop: assignWorkerToLocation,
    getLocationId: (el) => el.getAttribute("data-id")
  });

  // Enable drop on project cards (new overview design)
  attachDragDropHandlers(".project-card", {
    onDrop: assignWorkerToLocation,
    getLocationId: (el) => el.getAttribute("data-location")
  });

  // Bind calendar drag-and-drop handlers only once using event delegation
  if (!calendarDragDropHandlersBound) {
    calendarDragDropHandlersBound = true;
    
    // Calendar cells (standard calendar view)
    createCalendarDragDropHandler({
      selector: ".calendar__cell--drop",
      highlightRangeFn: highlightCalendarRange,
      assignFn: null, // Uses assignWorkerToCalendarDay directly
      getTargetWorkerId: (cell) => cell.getAttribute("data-worker-id"),
      getDay: (cell) => cell.getAttribute("data-day")
    })();
    
    // Calendar week view cells
    createCalendarDragDropHandler({
      selector: ".calendar-week-view__cell--drop",
      highlightRangeFn: highlightCalendarWeekRange,
      assignFn: null, // Uses assignWorkerToCalendarDayWithLocation directly
      supportsLocation: true,
      dayNames: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"],
      getTargetWorkerId: (cell) => cell.getAttribute("data-worker-id"),
      getDay: (cell) => cell.getAttribute("data-day")
    })();
    
    // Calendar overview cells (supports teams)
    createCalendarDragDropHandler({
      selector: ".calendar-overview__cell--drop",
      highlightRangeFn: highlightCalendarOverviewRange,
      assignFn: assignTeamToMultipleDays,
      supportsTeams: true,
      getLocationId: (cell) => cell.getAttribute("data-location-id"),
      getDayIndex: (cell) => parseInt(cell.getAttribute("data-day-index") || "0"),
      clearDragStateFn: clearCalendarOverviewDragState
    })();
  }
  
  // Helper functions for calendar overview (used by createCalendarDragDropHandler)
  // Note: Functions must be defined before they are used in event handlers below
  function highlightCalendarOverviewRange() {
    if (!uiState.dragStartCell || !uiState.dragEndCell) return;
    
    const startLocationId = uiState.dragStartCell.getAttribute("data-location-id");
    const startDayIndex = parseInt(uiState.dragStartCell.getAttribute("data-day-index") || "0");
    const endLocationId = uiState.dragEndCell.getAttribute("data-location-id");
    const endDayIndex = parseInt(uiState.dragEndCell.getAttribute("data-day-index") || "0");
    
    // Clear all highlights first
    document.querySelectorAll(".calendar-overview__cell--drop").forEach((c) => {
      c.classList.remove("drop-target", "drop-range");
    });
    
    // Highlight range if same location
    if (startLocationId === endLocationId) {
      const dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
      const startIdx = Math.min(startDayIndex, endDayIndex);
      const endIdx = Math.max(startDayIndex, endDayIndex);
      
      for (let i = startIdx; i <= endIdx; i++) {
        const day = dayNames[i];
        const cell = document.querySelector(`.calendar-overview__cell--drop[data-location-id="${startLocationId}"][data-day="${day}"]`);
        if (cell) {
          if (i === startIdx || i === endIdx) {
            cell.classList.add("drop-target");
          } else {
            cell.classList.add("drop-range");
          }
        }
      }
    } else {
      // Different locations - just highlight start and end
      uiState.dragStartCell.classList.add("drop-target");
      uiState.dragEndCell.classList.add("drop-target");
    }
  }
  
  function clearCalendarOverviewDragState() {
    document.querySelectorAll(".calendar-overview__cell--drop").forEach((c) => {
      c.classList.remove("drop-target", "drop-range", "drop-selected");
    });
    document.querySelectorAll(".cell-worker-pill").forEach((p) => {
      p.classList.remove("dragging");
    });
    document.querySelectorAll(".team-card").forEach((tc) => {
      tc.classList.remove("dragging");
    });
    uiState.draggedWorkerId = null;
    uiState.draggedTeamId = null;
    uiState.dragStartCell = null;
    uiState.dragEndCell = null;
    uiState.selectedCells = [];
    uiState.isMultiSelect = false;
    // Note: draggedFromLocationId and draggedFromDay are reset in drop handler
  }
  
  function clearMultiSelect() {
    // Clear visual feedback from all cells
    document.querySelectorAll(".calendar-overview__cell--drop").forEach(cell => {
      cell.classList.remove("drop-target", "drop-selected");
    });
    uiState.selectedCells = [];
    uiState.isMultiSelect = false;
  }

  // View switching via event delegation on document (works for dynamically rendered elements)
  // Note: handleViewSwitch already uses e.target.closest('[data-view]') - perfect for delegation
  document.addEventListener('click', handleViewSwitch);
  
  
  attachWorkerStatusHandlers();
  attachPersonDragHandlers();
  attachCalendarNavigationHandlers();
  attachWorkerPillHandlers();
  attachUserMenuHandlers();
  attachPlanViewHandlers();
  attachTimeEntryHandlers();
  attachCalendarViewModeHandlers();
  
  // Setup scroll synchronization for week view after all handlers are attached
  if (uiState.calendarViewMode === 'week') {
    setTimeout(() => {
      setupScrollSynchronization();
    }, 100);
  }
}

// Attach calendar view mode handlers (bound once via event delegation)
let calendarViewModeHandlersBound = false;

function attachCalendarViewModeHandlers() {
  if (calendarViewModeHandlersBound) return;
  calendarViewModeHandlersBound = true;
  
  // View mode switcher via event delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view-mode]');
    if (btn) {
      const mode = btn.getAttribute('data-view-mode');
      uiState.calendarViewMode = mode;
      renderApp();
    }
  });
  
  // Month navigation via event delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-month-nav]');
    if (btn) {
      const direction = btn.getAttribute('data-month-nav');
      const calDate = new Date(uiState.calendarDate);
      if (direction === 'prev') {
        calDate.setMonth(calDate.getMonth() - 1);
      } else {
        calDate.setMonth(calDate.getMonth() + 1);
      }
      uiState.calendarDate = calDate;
      renderApp();
    }
  });
  
  // Day navigation via event delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-day-nav]');
    if (btn) {
      const direction = btn.getAttribute('data-day-nav');
      let date = uiState.selectedDay ? new Date(uiState.selectedDay) : new Date();
      
      if (direction === 'prev') {
        date.setDate(date.getDate() - 1);
      } else if (direction === 'next') {
        date.setDate(date.getDate() + 1);
      } else if (direction === 'today') {
        date = new Date();
      }
      
      date.setHours(0, 0, 0, 0);
      uiState.selectedDay = date;
      uiState.calendarDate = date;
      renderApp();
    }
  });
  
  // Month view day click via event delegation
  document.addEventListener('click', (e) => {
    const day = e.target.closest('.month-view__day[data-date]');
    if (day) {
      const timestamp = parseInt(day.getAttribute('data-date'));
      const clickedDate = new Date(timestamp);
      clickedDate.setHours(0, 0, 0, 0);
      uiState.selectedDay = clickedDate;
      uiState.calendarDate = clickedDate;
      uiState.calendarViewMode = 'day';
      renderApp();
    }
  });
  
  // Year view day click via event delegation
  document.addEventListener('click', (e) => {
    const day = e.target.closest('.year-view__day[data-date]');
    if (day) {
      const timestamp = parseInt(day.getAttribute('data-date'));
      const clickedDate = new Date(timestamp);
      clickedDate.setHours(0, 0, 0, 0);
      uiState.selectedDay = clickedDate;
      uiState.calendarDate = clickedDate;
      uiState.calendarViewMode = 'day';
      renderApp();
    }
  });
  
  // Year view month click via event delegation
  document.addEventListener('click', (e) => {
    const header = e.target.closest('.year-view__month-header[data-month]');
    if (header) {
      const month = parseInt(header.getAttribute('data-month'));
      const calDate = new Date(uiState.calendarDate || new Date());
      calDate.setMonth(month);
      uiState.calendarDate = calDate;
      uiState.calendarViewMode = 'month';
      renderApp();
    }
  });
  
  // Year navigation via event delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-year-nav]');
    if (btn) {
      const direction = btn.getAttribute('data-year-nav');
      const calDate = new Date(uiState.calendarDate || new Date());
      if (direction === 'prev') {
        calDate.setFullYear(calDate.getFullYear() - 1);
      } else if (direction === 'next') {
        calDate.setFullYear(calDate.getFullYear() + 1);
      }
      uiState.calendarDate = calDate;
      renderApp();
    }
  });
  
  // "+ Zeit erfassen" Button Handler via event delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btn-add-time-entry-header, #btn-add-time-entry-day, #btn-add-time-entry-empty');
    if (btn) {
      openTimeEntryWizard();
    }
  });
  
  // Day Location Selector Handler via event delegation
  document.addEventListener('change', (e) => {
    if (e.target.id === 'day-location-selector') {
      uiState.selectedLocationIdDayView = e.target.value;
      renderApp();
    }
  });
  
  // Edit/Delete Entry Handlers via event delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-edit-entry]');
    if (btn) {
      const entryId = btn.getAttribute('data-edit-entry');
      // TODO: Implement edit entry
      console.log('Edit entry:', entryId);
    }
    
    const deleteBtn = e.target.closest('[data-delete-entry]');
    if (deleteBtn) {
      const entryId = deleteBtn.getAttribute('data-delete-entry');
      if (confirm('Möchten Sie diesen Zeiteintrag wirklich löschen?')) {
        api.deleteTimeEntry(entryId).then(async () => {
          await loadTimeEntries();
          renderApp();
        }).catch(error => {
          console.error('Error deleting entry:', error);
          alert('Fehler beim Löschen: ' + error.message);
        });
      }
    }
  });
  
  // User Switcher Handler (for admins) via event delegation
  document.addEventListener('change', async (e) => {
    if (e.target.id === 'user-switcher-select') {
      const selectedValue = e.target.value;
      const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
      const currentUserId = data.currentUser?.id || null;
      const viewMode = uiState.calendarViewMode || 'week';
      const selectedDate = uiState.selectedDay || uiState.calendarDate || new Date();
      const weekStart = new Date(selectedDate);
      const dayOfWeek = weekStart.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysFromMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      console.log('[AdminSwitch]', {
        selectedUserId: selectedValue === 'current' ? null : selectedValue,
        currentUserId: currentUserId,
        isAdmin: isAdmin,
        viewMode: viewMode,
        selectedDate: selectedDate.toISOString().split('T')[0],
        weekStart: weekStart.toISOString().split('T')[0]
      });
      
      if (selectedValue === 'current') {
        uiState.selectedUserId = null;
      } else {
        uiState.selectedUserId = selectedValue;
      }
      
      const activeCalendarUserId = getActiveCalendarUserId();
      console.log('[AdminSwitch] activeCalendarUserId:', activeCalendarUserId);
      
      // Reload time entries for current view range
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      console.log('[LoadEntries]', {
        activeCalendarUserId: activeCalendarUserId,
        selectedUserId: uiState.selectedUserId,
        dateFrom: weekStartStr,
        dateTo: weekEndStr
      });
      
      await loadTimeEntries(weekStartStr, weekEndStr);
      
      // Force re-render of all views
      renderApp();
    }
  });
  
  // Time Entry Wizard Actions via event delegation (bound once)
  let timeEntryActionsBound = false;
  if (!timeEntryActionsBound) {
    timeEntryActionsBound = true;
    
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action^="timeentry-"]');
      if (!btn) return;
      
      const action = btn.getAttribute('data-action');
      e.preventDefault();
      e.stopPropagation();
      
      if (action === 'timeentry-cancel') {
        closeTimeEntryWizard();
      } else if (action === 'timeentry-save') {
        const categoriesWithoutProject = ['KRANKHEIT', 'TRAINING', 'PAUSE', 'BUERO_ALLGEMEIN'];
        const requiresProject = !timeEntryWizardState.category.startsWith('PROJECT_') && !categoriesWithoutProject.includes(timeEntryWizardState.category);
        
        if (timeEntryWizardState.categoryType === 'standard' && requiresProject) {
          const locationId = document.getElementById('wizard-location')?.value;
          if (!locationId) {
            alert('Bitte wählen Sie eine Baustelle aus.');
            return;
          }
          timeEntryWizardState.locationId = locationId;
        } else if (timeEntryWizardState.categoryType === 'standard' && timeEntryWizardState.category === 'BUERO_ALLGEMEIN') {
          const locationId = document.getElementById('wizard-location')?.value;
          timeEntryWizardState.locationId = locationId || null;
        }
        
        const notes = document.getElementById('wizard-notes')?.value || '';
        timeEntryWizardState.notes = notes;
        const replaceExisting = document.getElementById('wizard-replace-existing')?.checked || false;
        
        await saveTimeEntryFromWizard(replaceExisting);
        await loadTimeEntries();
        renderApp();
      } else if (action === 'timeentry-next') {
        if (timeEntryWizardState.step === 1) {
          const startSelect = document.getElementById('wizard-start-time');
          const endSelect = document.getElementById('wizard-end-time');
          const dateInput = document.getElementById('wizard-date');
          const userSelect = document.getElementById('wizard-user');
          
          if (startSelect && endSelect) {
            timeEntryWizardState.startTime = startSelect.value;
            timeEntryWizardState.endTime = endSelect.value;
          }
          if (dateInput) {
            timeEntryWizardState.date = dateInput.value;
          }
          if (userSelect) {
            timeEntryWizardState.selectedUserId = userSelect.value;
          }
          timeEntryWizardState.step = 2;
          renderApp();
        } else if (timeEntryWizardState.step === 2) {
          const categorySelect = document.getElementById('wizard-category');
          if (categorySelect) {
            const selectedOption = categorySelect.options[categorySelect.selectedIndex];
            const categoryValue = categorySelect.value;
            const categoryType = selectedOption?.getAttribute('data-category-type');
            const projectId = selectedOption?.getAttribute('data-project-id');
            
            timeEntryWizardState.category = categoryValue;
            timeEntryWizardState.categoryType = categoryType || 'standard';
            
            if (categoryType === 'project') {
              timeEntryWizardState.selectedProjectId = projectId;
              timeEntryWizardState.locationId = projectId;
            } else {
              timeEntryWizardState.selectedProjectId = null;
              timeEntryWizardState.locationId = null;
              
              if (categoryValue === 'KRANKHEIT') {
                const workHours = getDefaultWorkHours();
                if (timeEntryWizardState.startTime === '08:00' && timeEntryWizardState.endTime === '12:00') {
                  timeEntryWizardState.startTime = workHours.workday_start;
                  timeEntryWizardState.endTime = workHours.workday_end;
                }
              }
            }
            
            const categoriesWithoutProject = ['KRANKHEIT', 'TRAINING', 'PAUSE', 'BUERO_ALLGEMEIN'];
            const requiresProject = !categoryValue.startsWith('PROJECT_') && !categoriesWithoutProject.includes(categoryValue);
            
            if (categoryType === 'project' || !requiresProject) {
              const notes = document.getElementById('wizard-notes')?.value || '';
              timeEntryWizardState.notes = notes;
              await saveTimeEntryFromWizard(false);
              await loadTimeEntries();
              renderApp();
            } else {
              timeEntryWizardState.step = 3;
              renderApp();
            }
          }
        } else if (timeEntryWizardState.step === 3) {
          const categoriesWithoutProject = ['KRANKHEIT', 'TRAINING', 'PAUSE', 'BUERO_ALLGEMEIN'];
          const requiresProject = !timeEntryWizardState.category.startsWith('PROJECT_') && !categoriesWithoutProject.includes(timeEntryWizardState.category);
          
          if (timeEntryWizardState.categoryType === 'project' || !requiresProject) {
            const notes = document.getElementById('wizard-notes')?.value || '';
            timeEntryWizardState.notes = notes;
            await saveTimeEntryFromWizard(false);
            await loadTimeEntries();
            renderApp();
          }
        }
      } else if (action === 'timeentry-prev') {
        if (timeEntryWizardState.step > 1) {
          timeEntryWizardState.step--;
          renderApp();
        }
      } else if (action === 'timeentry-confirm') {
        const entryId = btn.getAttribute('data-entry-id');
        if (entryId) {
          btn.disabled = true;
          try {
            const response = await api.confirmTimeEntry(entryId);
            if (response.success) {
              await loadTimeEntries();
              renderApp();
            } else {
              alert('Fehler beim Bestätigen: ' + (response.error || 'Unbekannter Fehler'));
              btn.disabled = false;
            }
          } catch (error) {
            console.error('Error confirming entry:', error);
            alert('Fehler beim Bestätigen: ' + error.message);
            btn.disabled = false;
          }
        }
      } else if (action === 'timeentry-reject') {
        const entryId = btn.getAttribute('data-entry-id');
        if (entryId) {
          btn.disabled = true;
          try {
            const response = await api.rejectTimeEntry(entryId);
            if (response.success) {
              await loadTimeEntries();
              renderApp();
            } else {
              alert('Fehler beim Ablehnen: ' + (response.error || 'Unbekannter Fehler'));
              btn.disabled = false;
            }
          } catch (error) {
            console.error('Error rejecting entry:', error);
            alert('Fehler beim Ablehnen: ' + error.message);
            btn.disabled = false;
          }
        }
      } else if (action === 'cleanup-planned') {
        // PHASE 7: Cleanup PLANNED entries
        if (!confirm('Sind Sie sicher? Alle PLANNED Einträge werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.')) {
          return;
        }
        btn.disabled = true;
        try {
          const response = await api.request('admin/cleanup_planned', { method: 'POST' });
          if (response.ok || response.success) {
            alert(`Erfolgreich: ${response.deleted_count || 0} PLANNED Einträge gelöscht.`);
            // Reload current view
            if (workflowState.selectedDate) {
              await loadDayEntries(workflowState.selectedDate);
            }
            if (workflowState.selectedWeekStart) {
              await loadWeekEntries(workflowState.selectedWeekStart);
              if (workflowState.viewMode === 'team') {
                await loadTeamWeek(workflowState.selectedWeekStart);
              }
            }
            renderApp();
          } else {
            alert('Fehler beim Löschen: ' + (response.error || 'Unbekannter Fehler'));
            btn.disabled = false;
          }
        } catch (error) {
          console.error('Error cleaning up planned entries:', error);
          alert('Fehler beim Löschen: ' + error.message);
          btn.disabled = false;
        }
      } else if (action === 'confirm-day') {
        // PHASE 4: Confirm day using new workflow layer
        const dateStr = btn.getAttribute('data-date');
        if (!dateStr) return;
        
        btn.disabled = true;
        try {
          const response = await api.confirmDay(dateStr);
          if (response.ok || response.success) {
            // Reload day and week entries
            await loadDayEntries(dateStr);
            
            // Calculate week start for reload
            const date = new Date(dateStr);
            const dayOfWeek = date.getDay();
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - daysFromMonday);
            const weekStartStr = weekStart.toISOString().split('T')[0];
            await loadWeekEntries(weekStartStr);
            
            renderApp();
          } else {
            alert('Fehler beim Bestätigen: ' + (response.error || 'Unbekannter Fehler'));
            btn.disabled = false;
          }
        } catch (error) {
          console.error('Error confirming day:', error);
          alert('Fehler beim Bestätigen: ' + error.message);
          btn.disabled = false;
        }
      } else if (action === 'open-team-calendar' || action === 'show-team-calendar') {
        // PHASE 3: Open team calendar using new workflow layer
        const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
        if (!isAdmin) {
          alert('Nur Administratoren können den Teamkalender öffnen.');
          return;
        }
        try {
          // Calculate current week start (Monday)
          const calDate = workflowState.selectedDate ? new Date(workflowState.selectedDate) : (uiState.calendarDate || new Date());
          let currentDate = new Date(calDate);
          if (isNaN(currentDate.getTime())) {
            currentDate = new Date();
          }
          currentDate.setHours(0, 0, 0, 0);
          const dayOfWeek = currentDate.getDay();
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const weekStart = new Date(currentDate);
          weekStart.setDate(currentDate.getDate() - daysFromMonday);
          const weekStartStr = weekStart.toISOString().split('T')[0];

          // Use new workflow layer
          workflowState.viewMode = 'team';
          loadTeamWeek(weekStartStr).then(() => {
            renderApp();
          }).catch((error) => {
            console.error('Error loading team week:', error);
            alert('Fehler beim Laden des Teamkalenders: ' + error.message);
          });
        } catch (error) {
          console.error('Error preparing team calendar:', error);
          alert('Fehler beim Öffnen des Teamkalenders: ' + error.message);
        }
      } else if (action === 'close-team-calendar') {
        // PHASE 3: Close team calendar, return to previous view
        workflowState.viewMode = 'day';
        workflowState.cache.teamData = null;
        renderApp();
        // Return to normal calendar
        uiState.calendarViewMode = 'week';
        renderApp();
      }
    });
  }
  
  // Year navigation, year view day/month clicks, and week block handlers
  // are already handled via event delegation above (lines 1928-1952)
  // Only attach week block handlers once
  attachWeekBlockHandlers();
  
  // Time slot click handlers via event delegation (works for all views dynamically)
  document.addEventListener('click', (e) => {
    const slot = e.target.closest('.day-column__slot[data-click-slot="true"]');
    if (!slot) return;
    
    // Don't trigger if clicking on time entry block
    if (e.target.closest('.time-grid-entry-block')) return;
    
    const date = slot.getAttribute('data-date');
    const time = slot.getAttribute('data-time');
    const minutes = parseInt(slot.getAttribute('data-minutes'));
    
    // Find first available location or use default
    const locations = data.locations || [];
    let locationId = null;
    if (locations.length > 0) {
      // Check if user has time entries for any location on this date
      const activeWorkerId = getActiveWorkerId();
      const activeUserId = getActiveUserId();
      if (activeWorkerId || activeUserId) {
        // Normalize IDs for comparison
        const dayEntries = (data.timeEntries || []).filter(entry => {
          if (entry.entry_date !== date) return false;
          if (activeWorkerId) {
            return norm(entry.worker_id) === norm(activeWorkerId);
          } else if (activeUserId) {
            return norm(entry.user_id) === norm(activeUserId);
          }
          return false;
        });
        if (dayEntries.length > 0) {
          // Use location from existing entry
          locationId = dayEntries[0].location_id;
        } else {
          // Use first available location
          locationId = locations[0].id;
        }
      } else {
        locationId = locations[0].id;
      }
    }
    
    if (locationId) {
      // Calculate default end time (1 hour later)
      const endMinutes = minutes + 60;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      
      // Open wizard with suggested times
      openTimeEntryWizard(date, time, endTime);
    } else {
      // No location, open wizard anyway
      openTimeEntryWizard(date, time, null);
    }
  });
}

// Week Block Click Handler -> Day View Navigation (bound once via event delegation)
let weekBlockHandlersBound = false;

function attachWeekBlockHandlers() {
  if (weekBlockHandlersBound) return;
  weekBlockHandlersBound = true;
  
  // Use event delegation to handle clicks on time entry blocks in week view
  // This allows navigation to day view when clicking on an entry
  document.addEventListener('click', (e) => {
    const entryBlock = e.target.closest('.time-grid-entry-block');
    if (!entryBlock) return;
    
    const dateStr = entryBlock.getAttribute('data-date-key');
    if (!dateStr) return;
    
    // Parse date and navigate to day view
    const entryDate = new Date(dateStr + 'T00:00:00');
    if (isNaN(entryDate.getTime())) return;
    
    entryDate.setHours(0, 0, 0, 0);
    uiState.selectedDay = entryDate;
    uiState.calendarDate = entryDate;
    uiState.calendarViewMode = 'day';
    
    renderApp();
  });
}

// Handle quick actions (sick/vacation/office)
async function handleQuickAction(action, date) {
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  if (!activeWorkerId && !activeUserId) {
    alert('Kein Mitarbeiter oder User zugeordnet');
    return;
  }
  
  const workHours = getDefaultWorkHours();
  let category = 'BUERO_ALLGEMEIN';
  let timeFrom = workHours.workday_start;
  let timeTo = workHours.workday_end;
  
  if (action === 'sick') {
    category = 'KRANKHEIT';
  } else if (action === 'vacation') {
    category = 'FERIEN';
  } else if (action === 'office') {
    category = 'BUERO_ALLGEMEIN';
  }
  
  // Check if day has existing entries - normalize IDs
  const existingEntries = (data.timeEntries || []).filter(entry => {
    if (entry.entry_date !== date) return false;
    if (activeWorkerId) {
      return norm(entry.worker_id) === norm(activeWorkerId);
    } else if (activeUserId) {
      return norm(entry.user_id) === norm(activeUserId);
    }
    return false;
  });
  
  let autoReplace = false;
  if (existingEntries.length > 0) {
    const replace = confirm(`Der Tag hat bereits ${existingEntries.length} Zeiteintrag(e). Sollen diese durch "${category === 'KRANKHEIT' ? 'Krankheit' : category === 'FERIEN' ? 'Ferien' : 'Büro'}" ersetzt werden?`);
    autoReplace = replace;
    if (!replace) {
      return; // User cancelled
    }
  }
  
  try {
    const entryData = {
      location_id: null,
      date: date,
      time_from: timeFrom,
      time_to: timeTo,
      category: category,
      notes: action === 'sick' ? 'Ganzer Tag krank' : action === 'vacation' ? 'Ganzer Tag Ferien' : 'Ganzer Tag Büro',
      auto_replace: autoReplace
    };
    
    // Set worker_id or user_id based on what's available
    if (activeWorkerId) {
      entryData.worker_id = activeWorkerId;
    } else if (activeUserId) {
      entryData.user_id = activeUserId;
    }
    
    const response = await api.createTimeEntry(entryData);
    if (response.success) {
      await loadTimeEntries();
      renderApp();
    } else {
      alert(response.error || 'Fehler beim Erstellen');
    }
  } catch (error) {
    console.error('Error in quick action:', error);
    alert('Fehler: ' + error.message);
  }
}

// Get active user (selected by admin or current user)
function getActiveUser() {
  if (uiState.selectedUserId) {
    // Admin has selected a different user
    return data.users.find(u => u.id === uiState.selectedUserId) || data.currentUser;
  }
  // Return current logged in user
  return data.currentUser;
}

// Get active worker ID (for time entries)
function getActiveWorkerId() {
  const activeUser = getActiveUser();
  return activeUser?.workerId || null;
}

// Get active user ID (for time entries if no workerId)
function getActiveUserId() {
  const activeUser = getActiveUser();
  return activeUser?.id || null;
}

// Get active calendar user ID (for admin planning: selectedUserId, else currentUserId)
function getActiveCalendarUserId() {
  const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
  // calendarViewUserId is for viewing only (not planning)
  if (isAdmin && uiState.calendarViewUserId) {
    return uiState.calendarViewUserId;
  }
  return data.currentUser?.id || null;
}

function getCalendarViewUserId() {
  const u = data.currentUser;
  if (!u) return null;
  const isAdmin = u.role === 'Admin' || (u.permissions && u.permissions.includes('manage_users'));
  if (!isAdmin) return u.id;
  return uiState.calendarViewUserId || u.id;
}

// Get default work hours
function getDefaultWorkHours() {
  return {
    daily_hours: 8.5,
    workday_start: '08:00',
    workday_end: '16:30',
    workdays: [1, 2, 3, 4, 5] // Mo-Fr
  };
}

// Render time summary in sidebar
function renderTimeSummarySidebar() {
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  if (!activeWorkerId && !activeUserId) return '';
  
  const selectedDate = uiState.selectedDay ? new Date(uiState.selectedDay) : new Date();
  selectedDate.setHours(0, 0, 0, 0);
  const dateStr = selectedDate.toISOString().split('T')[0];
  
  // Get week range
  const weekStart = new Date(selectedDate);
  const dayOfWeek = selectedDate.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(selectedDate.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  
  // Normalize IDs for comparison
  // Calculate day totals
  const dayEntries = (data.timeEntries || []).filter(entry => {
    if (entry.entry_date !== dateStr) return false;
    if (activeWorkerId) {
      return norm(entry.worker_id) === norm(activeWorkerId);
    } else if (activeUserId) {
      return norm(entry.user_id) === norm(activeUserId);
    }
    return false;
  });
  // PHASE 6: Use entryHours (SINGLE SOURCE OF TRUTH)
  const dayTotal = dayEntries.reduce((sum, entry) => sum + entryHours(entry), 0);
  const daySoll = 8.5;
  const dayDiff = daySoll - dayTotal;
  
  // Calculate week totals
  const weekEntries = (data.timeEntries || []).filter(entry => {
    const entryDate = entry.entry_date;
    if (entryDate < weekStartStr || entryDate > weekEndStr) return false;
    if (activeWorkerId) {
      return norm(entry.worker_id) === norm(activeWorkerId);
    } else if (activeUserId) {
      return norm(entry.user_id) === norm(activeUserId);
    }
    return false;
  });
  // PHASE 6: Use entryHours (SINGLE SOURCE OF TRUTH)
  const weekTotal = weekEntries.reduce((sum, entry) => sum + entryHours(entry), 0);
  const weekSoll = 5 * 8.5; // 5 workdays
  const weekDiff = weekSoll - weekTotal;
  
  // PHASE 6: Category totals using entryHours (SINGLE SOURCE OF TRUTH)
  const dayCategoryTotals = groupByCategory(dayEntries);
  
  // PHASE 6: Week category totals using entryHours
  const weekCategoryTotals = groupByCategory(weekEntries);
  
  const categoryLabels = {
    'BUERO_ALLGEMEIN': 'Büro',
    'ENTWICKLUNG': 'Entwicklung',
    'MEETING': 'Meeting',
    'KRANKHEIT': 'Krankheit',
    'TRAINING': 'Training',
    'PAUSE': 'Pause'
  };
  
  return `
    <div class="sidebar-time-summary">
      <div class="time-summary-section">
        <div class="time-summary__title">Heute (${formatDateForDisplay(selectedDate)})</div>
        <div class="time-summary__row">
          <span class="time-summary__label">Ist:</span>
          <span class="time-summary__value ${dayTotal >= daySoll ? 'time-summary__value--complete' : ''}">${dayTotal.toFixed(2)}h</span>
        </div>
        <div class="time-summary__row">
          <span class="time-summary__label">Soll:</span>
          <span class="time-summary__value">${daySoll}h</span>
        </div>
        <div class="time-summary__row">
          <span class="time-summary__label">Diff:</span>
          <span class="time-summary__value ${dayDiff > 0 ? 'time-summary__value--warning' : dayDiff < 0 ? 'time-summary__value--overtime' : ''}">${dayDiff > 0 ? '+' : ''}${dayDiff.toFixed(2)}h</span>
        </div>
        ${Object.keys(dayCategoryTotals).length > 0 ? `
          <div class="time-summary__categories">
            ${Object.entries(dayCategoryTotals).map(([cat, hours]) => `
              <div class="time-summary__category">
                <span class="time-summary__category-label">${categoryLabels[cat] || cat}:</span>
                <span class="time-summary__category-value">${hours.toFixed(2)}h</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      
      <div class="time-summary-section">
        <div class="time-summary__title">Woche (KW ${getWeekNumber(weekStart)})</div>
        <div class="time-summary__row">
          <span class="time-summary__label">Ist:</span>
          <span class="time-summary__value ${weekTotal >= weekSoll ? 'time-summary__value--complete' : ''}">${weekTotal.toFixed(2)}h</span>
        </div>
        <div class="time-summary__row">
          <span class="time-summary__label">Soll:</span>
          <span class="time-summary__value">${weekSoll}h</span>
        </div>
        <div class="time-summary__row">
          <span class="time-summary__label">Diff:</span>
          <span class="time-summary__value ${weekDiff > 0 ? 'time-summary__value--warning' : weekDiff < 0 ? 'time-summary__value--overtime' : ''}">${weekDiff > 0 ? '+' : ''}${weekDiff.toFixed(2)}h</span>
        </div>
        ${Object.keys(weekCategoryTotals).length > 0 ? `
          <div class="time-summary__categories">
            ${Object.entries(weekCategoryTotals).map(([cat, hours]) => `
              <div class="time-summary__category">
                <span class="time-summary__category-label">${categoryLabels[cat] || cat}:</span>
                <span class="time-summary__category-value">${hours.toFixed(2)}h</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Year View Component
function renderYearView() {
  const calDate = uiState.calendarDate || new Date();
  const year = calDate.getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get active user (selected by admin or current user)
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const yearStartStr = yearStart.toISOString().split('T')[0];
  const yearEndStr = yearEnd.toISOString().split('T')[0];
  
  // Calculate day summaries from existing timeEntries - normalize IDs
  const daySummaries = {};
  if ((activeWorkerId || activeUserId) && data.timeEntries) {
    const yearEntries = data.timeEntries.filter(entry => {
      // Normalize IDs for comparison
      if (activeWorkerId) {
        if (norm(entry.worker_id) !== norm(activeWorkerId)) return false;
      } else if (activeUserId) {
        if (norm(entry.user_id) !== norm(activeUserId)) return false;
      } else {
        return false;
      }
      const entryDate = new Date(entry.entry_date + 'T00:00:00');
      return entryDate >= yearStart && entryDate <= yearEnd;
    });
    
    yearEntries.forEach(entry => {
      const dateStr = entry.entry_date;
      if (!daySummaries[dateStr]) {
        daySummaries[dateStr] = { total_hours: 0, by_category: {} };
      }
      const hours = entryHours(entry);
      daySummaries[dateStr].total_hours += hours;
      daySummaries[dateStr].by_category[entry.category] = (daySummaries[dateStr].by_category[entry.category] || 0) + hours;
    });
  }
  
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  
  // Render mini month grid
  const renderMiniMonth = (monthIndex) => {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
    
    const days = [];
    // Empty cells before month start
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    // Days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, monthIndex, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = date.getTime() === today.getTime();
      const isSelected = uiState.selectedDay && date.getTime() === new Date(uiState.selectedDay).getTime();
      const summary = daySummaries[dateStr] || { total_hours: 0, by_category: {} };
      
      days.push({
        day,
        date,
        dateStr,
        isToday,
        isSelected,
        totalHours: summary.total_hours || 0,
        categories: summary.by_category || {}
      });
    }
    
    return `
      <div class="year-view__month">
        <div class="year-view__month-header" data-month="${monthIndex}">
          ${monthNames[monthIndex]}
        </div>
        <div class="year-view__month-weekdays">
          ${dayNames.map(day => `<div class="year-view__weekday">${day}</div>`).join('')}
        </div>
        <div class="year-view__month-grid">
          ${days.map((day, idx) => {
            if (!day) {
              return '<div class="year-view__day year-view__day--empty"></div>';
            }
            
            const categoryColors = {
              'BUERO_ALLGEMEIN': '#6a4df7',
              'ENTWICKLUNG': '#3b82f6',
              'MEETING': '#10b981',
              'KRANKHEIT': '#ef4444',
              'TRAINING': '#f59e0b',
              'PAUSE': '#6b7280'
            };
            
            const categoryIndicators = Object.keys(day.categories).slice(0, 2).map(cat => {
              const color = categoryColors[cat] || '#6b7280';
              return `<span class="year-view__category-dot" style="background: ${color}"></span>`;
            }).join('');
            
            return `
              <div class="year-view__day ${day.isToday ? 'year-view__day--today' : ''} ${day.isSelected ? 'year-view__day--selected' : ''}" 
                   data-date="${day.date.getTime()}" 
                   data-date-str="${day.dateStr}"
                   title="${day.dateStr}: ${day.totalHours.toFixed(1)}h">
                <div class="year-view__day-number">${day.day}</div>
                ${day.totalHours > 0 ? `
                  <div class="year-view__day-hours">${day.totalHours.toFixed(1)}h</div>
                  <div class="year-view__day-categories">${categoryIndicators}</div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };
  
  return `
    <section class="year-view">
      <div class="year-view__header">
        <div class="year-view__navigation">
          <button class="btn-year-nav" data-year-nav="prev" title="Vorheriges Jahr">‹</button>
          <div class="year-view__title">${year}</div>
          <button class="btn-year-nav" data-year-nav="next" title="Nächstes Jahr">›</button>
        </div>
      </div>
      
      <div class="year-view__grid">
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(monthIndex => renderMiniMonth(monthIndex)).join('')}
      </div>
    </section>
  `;
}

// Month View Component
function renderMonthView() {
  const calDate = uiState.calendarDate || new Date();
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get first day of month and last day
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  
  // Get active user (selected by admin or current user)
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  
  let monthData = { summary: {}, flags: {} };
  
  // Calculate month summary from existing timeEntries
  if ((activeWorkerId || activeUserId) && data.timeEntries) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    // Normalize IDs for comparison
    const monthEntries = data.timeEntries.filter(entry => {
      // Normalize IDs for comparison
      if (activeWorkerId) {
        if (norm(entry.worker_id) !== norm(activeWorkerId)) return false;
      } else if (activeUserId) {
        if (norm(entry.user_id) !== norm(activeUserId)) return false;
      } else {
        return false;
      }
      const entryDate = new Date(entry.entry_date + 'T00:00:00');
      return entryDate >= monthStart && entryDate <= monthEnd;
    });
    
    // Build summary
    monthEntries.forEach(entry => {
      const dateStr = entry.entry_date;
      if (!monthData.summary[dateStr]) {
        monthData.summary[dateStr] = { total_hours: 0, by_category: {}, by_location: {} };
      }
      const summary = monthData.summary[dateStr];
      const hours = entryHours(entry);
      summary.total_hours += hours;
      summary.by_category[entry.category] = (summary.by_category[entry.category] || 0) + hours;
      summary.by_location[entry.location_id] = (summary.by_location[entry.location_id] || 0) + hours;
      
      // Set flags
      if (!monthData.flags[dateStr]) {
        monthData.flags[dateStr] = {};
      }
      if (entry.category === 'KRANKHEIT') {
        monthData.flags[dateStr].sick = true;
      }
    });
  }
  
  // Generate calendar grid
  const days = [];
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  
  // Add empty cells for days before month start
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add days of month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];
    const isToday = date.getTime() === today.getTime();
    const isSelected = uiState.selectedDay && date.getTime() === new Date(uiState.selectedDay).getTime();
    
    const daySummary = monthData.summary[dateStr] || { total_hours: 0, by_category: {}, by_location: {} };
    const dayFlags = monthData.flags[dateStr] || {};
    
    days.push({
      day,
      date,
      dateStr,
      isToday,
      isSelected,
      totalHours: daySummary.total_hours || 0,
      categories: daySummary.by_category || {},
      flags: dayFlags
    });
  }
  
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  
  return `
    <section class="month-view">
      <div class="month-view__header">
        <div class="month-view__navigation">
          <button class="btn-month-nav" data-month-nav="prev" title="Vorheriger Monat">‹</button>
          <div class="month-view__title">${monthNames[month]} ${year}</div>
          <button class="btn-month-nav" data-month-nav="next" title="Nächster Monat">›</button>
        </div>
      </div>
      
      <div class="month-view__calendar">
        <div class="month-view__weekdays">
          ${dayNames.map(day => `<div class="month-view__weekday">${day}</div>`).join('')}
        </div>
        <div class="month-view__grid">
          ${days.map((day, idx) => {
            if (!day) {
              return '<div class="month-view__day month-view__day--empty"></div>';
            }
            
            const categoryColors = {
              'BUERO_ALLGEMEIN': '#6a4df7',
              'ENTWICKLUNG': '#3b82f6',
              'MEETING': '#10b981',
              'KRANKHEIT': '#ef4444',
              'TRAINING': '#f59e0b',
              'PAUSE': '#6b7280'
            };
            
            const categoryIndicators = Object.keys(day.categories).slice(0, 3).map(cat => {
              const hours = day.categories[cat];
              const color = categoryColors[cat] || '#6b7280';
              return `<span class="category-indicator" style="background: ${color}" title="${cat}: ${hours.toFixed(1)}h"></span>`;
            }).join('');
            
            return `
              <div class="month-view__day ${day.isToday ? 'month-view__day--today' : ''} ${day.isSelected ? 'month-view__day--selected' : ''} ${day.flags.sick ? 'month-view__day--sick' : ''} ${day.flags.vacation ? 'month-view__day--vacation' : ''}" 
                   data-date="${day.date.getTime()}" 
                   data-date-str="${day.dateStr}">
                <div class="month-view__day-number">${day.day}</div>
                ${day.totalHours > 0 ? `
                  <div class="month-view__day-hours">${day.totalHours.toFixed(1)}h</div>
                  <div class="month-view__day-categories">${categoryIndicators}</div>
                ` : ''}
                ${day.flags.sick ? '<div class="month-view__day-flag month-view__day-flag--sick">🏥</div>' : ''}
                ${day.flags.vacation ? '<div class="month-view__day-flag month-view__day-flag--vacation">🏖️</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

// Day View Component (enhanced)
function renderDayView() {
  if (!uiState.selectedDay) {
    // If no day selected, use today
    uiState.selectedDay = new Date();
    uiState.selectedDay.setHours(0, 0, 0, 0);
  }
  
  const date = new Date(uiState.selectedDay);
  const dateStr = date.toISOString().split('T')[0];
  const dayName = getDayName(date);
  const { workingWorkers, activeLocations } = getDayDetailsData(date);
  
  // For day view: use calendarViewUserId if set (admin viewing another user's calendar)
  const activeDayUserId = getCalendarViewUserId();
  const activeDayUser = activeDayUserId ? data.users.find(u => u.id === activeDayUserId) : null;
  const activeDayWorkerId = activeDayUser?.workerId || null;
  
  // Get time entries for this day - normalize IDs for comparison (current user only)
  const dayTimeEntries = (data.timeEntries || []).filter(entry => {
    // First check date
    if (entry.entry_date !== dateStr) return false;
    
    // Then check worker_id or user_id with normalized comparison (current user only)
    if (activeDayWorkerId) {
      return norm(entry.worker_id) === norm(activeDayWorkerId);
    } else if (activeDayUserId) {
      return norm(entry.user_id) === norm(activeDayUserId);
    }
    return false;
  });
  
  // PHASE 6: Calculate day totals using entryHours (SINGLE SOURCE OF TRUTH)
  const dayTotal = dayTimeEntries.reduce((sum, entry) => sum + entryHours(entry), 0);
  const confirmedHours = dayTimeEntries
    .filter(entry => entry.status === 'CONFIRMED')
    .reduce((sum, entry) => sum + entryHours(entry), 0);
  const daySoll = 8.5; // Default, could be from user settings
  const dayDiff = daySoll - dayTotal;
  
  // PHASE 6: Group by category using groupByCategory (SINGLE SOURCE OF TRUTH)
  const categoryTotals = groupByCategory(dayTimeEntries);
  
  // Check if there are PLANNED entries for confirm button
  const hasPlannedEntries = dayTimeEntries.some(entry => entry.status === 'PLANNED');
  // Confirm-Day ist eine persönliche Bestätigung: nur eigener Kalender darf bestätigt werden
  const currentUserId = data.currentUser?.id || null;
  const calendarViewUserId = getCalendarViewUserId();
  const canConfirmDay = !!currentUserId && currentUserId === calendarViewUserId;
  
  // PHASE 6: Group by location using entryHours (SINGLE SOURCE OF TRUTH)
  const locationTotals = {};
  dayTimeEntries.forEach(entry => {
    if (entry.location_id) {
      const locId = entry.location_id;
      locationTotals[locId] = (locationTotals[locId] || 0) + entryHours(entry);
    }
  });
  
  return `
    <section class="day-view">
      <!-- Header mit Datum und Navigation -->
      <div class="day-view__header">
        <div class="day-view__header-left">
          <div class="day-view__day-name">${dayName}</div>
          <div class="day-view__date">${formatDateForDisplay(date)}</div>
        </div>
        <div class="day-view__header-right">
          <div class="day-view__navigation">
            <button class="btn-nav-icon" data-day-nav="prev" title="Vorheriger Tag">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <button class="btn-nav-text" data-day-nav="today" title="Heute">Heute</button>
            <button class="btn-nav-icon" data-day-nav="next" title="Nächster Tag">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Statistik Cards -->
      <div class="day-view__stats">
        <div class="stat-card stat-card--primary">
          <div class="stat-card__label">Tages-Summe</div>
          <div class="stat-card__value ${dayTotal >= daySoll ? 'stat-card__value--complete' : ''}">${dayTotal.toFixed(2)}h</div>
          <div class="stat-card__subtitle">von ${daySoll}h</div>
        </div>
        <div class="stat-card stat-card--success">
          <div class="stat-card__label">Bestätigt</div>
          <div class="stat-card__value">${confirmedHours.toFixed(2)}h</div>
          <div class="stat-card__subtitle">${hasPlannedEntries ? `${dayTimeEntries.filter(e => e.status === 'PLANNED').length} geplant` : 'vollständig'}</div>
        </div>
        <div class="stat-card stat-card--${dayDiff > 0 ? 'warning' : dayDiff < 0 ? 'success' : 'neutral'}">
          <div class="stat-card__label">Differenz</div>
          <div class="stat-card__value">${dayDiff > 0 ? '+' : ''}${dayDiff.toFixed(2)}h</div>
          <div class="stat-card__subtitle">${dayDiff > 0 ? 'Fehlend' : dayDiff < 0 ? 'Überstunden' : 'Erfüllt'}</div>
        </div>
        ${Object.keys(categoryTotals).length > 0 ? `
          <div class="stat-card stat-card--categories">
            <div class="stat-card__label">Kategorien</div>
            <div class="stat-card__categories">
              ${Object.entries(categoryTotals).map(([cat, hours]) => {
                const categoryLabels = {
                  'BUERO_ALLGEMEIN': 'Büro',
                  'ENTWICKLUNG': 'Entwicklung',
                  'MEETING': 'Meeting',
                  'KRANKHEIT': 'Krankheit',
                  'TRAINING': 'Training',
                  'PAUSE': 'Pause'
                };
                return `
                  <div class="category-badge">
                    <span class="category-badge__name">${categoryLabels[cat] || cat}</span>
                    <span class="category-badge__hours">${hours.toFixed(2)}h</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      
      ${hasPlannedEntries && canConfirmDay ? `
        <div class="day-view__confirm-section">
          <button class="btn-primary btn-confirm-day" data-action="confirm-day" data-date="${dateStr}" title="Alle geplanten Zeiten für diesen Tag bestätigen">
            <span class="btn-icon">✓</span>
            <span class="btn-text">Geplante Zeiten bestätigen</span>
          </button>
        </div>
      ` : ''}
      
      <!-- Tagesabschluss Status -->
      <div class="day-view__timesheet-status" id="day-timesheet-status-${dateStr}">
        <!-- Status wird asynchron geladen -->
      </div>
      
      <!-- Hauptinhalt: 2-Spalten Layout -->
      <div class="day-view__content">
        <!-- Linke Spalte: Zeiteinträge -->
        <div class="day-view__entries-panel">
          <div class="panel-header">
            <h3 class="panel-title">Zeiteinträge</h3>
            <button class="btn-add-entry" id="btn-add-time-entry-day">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Zeit erfassen</span>
            </button>
          </div>
          <div class="panel-body">
            ${dayTimeEntries.length > 0 ? `
              <div class="entries-list">
                ${dayTimeEntries.map(entry => {
                  const location = entry.location_id ? (data.locations || []).find(l => l.id === entry.location_id) : null;
                  const locationName = location ? (location.code || location.address || 'Unbekannt') : 'Intern';
                  const categoryLabels = {
                    'BUERO_ALLGEMEIN': 'Büro',
                    'ENTWICKLUNG': 'Entwicklung',
                    'MEETING': 'Meeting',
                    'KRANKHEIT': 'Krankheit',
                    'TRAINING': 'Training',
                    'PAUSE': 'Pause'
                  };
                  const categoryLabel = categoryLabels[entry.category] || entry.category || 'Unbekannt';
                  return `
                    <div class="entry-card" data-entry-id="${entry.id}">
                      <div class="entry-card__time">
                        <div class="entry-time-range">
                          <span class="time-from">${entry.time_from || '—'}</span>
                          <span class="time-separator">–</span>
                          <span class="time-to">${entry.time_to || '—'}</span>
                        </div>
                        <div class="entry-hours">${entryHours(entry).toFixed(2)}h</div>
                      </div>
                      <div class="entry-card__content">
                        <div class="entry-category">${categoryLabel}</div>
                        ${location ? `<div class="entry-location">📍 ${locationName}</div>` : ''}
                        ${entry.notes ? `<div class="entry-notes">${entry.notes}</div>` : ''}
                      </div>
                      <div class="entry-card__actions">
                        <button class="btn-action btn-action--edit" data-edit-entry="${entry.id}" title="Bearbeiten">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="btn-action btn-action--delete" data-delete-entry="${entry.id}" title="Löschen">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="empty-state">
                <div class="empty-state__icon">📅</div>
                <div class="empty-state__title">Noch keine Zeiteinträge</div>
                <div class="empty-state__text">Erfassen Sie Ihre erste Zeit für diesen Tag</div>
                <button class="btn btn--primary" id="btn-add-time-entry-empty">Zeit erfassen</button>
              </div>
            `}
          </div>
        </div>
        
        <!-- Rechte Spalte: Baustellen-Details -->
        <div class="day-view__details-panel">
          ${renderDayDetailsSection(date, dayTimeEntries)}
        </div>
      </div>
    </section>
  `;
}

function attachUserMenuHandlers() {
  const userChip = document.getElementById("user-chip-menu");
  const userMenu = document.getElementById("user-menu");
  const logoutBtn = document.getElementById("btn-logout");
  
  if (userChip && userMenu) {
    userChip.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = userMenu.style.display !== "none";
      userMenu.style.display = isVisible ? "none" : "block";
    });
    
    document.addEventListener("click", (e) => {
      if (!userChip.contains(e.target)) {
        userMenu.style.display = "none";
      }
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      logout();
    });
  }
}

function attachPlanViewHandlers() {
  document.querySelectorAll("[data-view-plan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const locationId = btn.getAttribute("data-view-plan");
      openPlanViewModal(locationId);
    });
  });
}

function openPlanViewModal(locationId) {
  const location = data.locations.find(l => l.id === locationId);
  if (!location || !location.planFile) return;
  
  const modalRoot = document.getElementById("modal-root");
  const isPdf = location.planFileName && location.planFileName.toLowerCase().endsWith('.pdf');
  const isImage = location.planFile.startsWith('data:image/');
  
  modalRoot.innerHTML = `
    <div class="modal-overlay" id="plan-view-modal">
      <div class="modal modal--plan-view">
        <div class="modal__header">
          <h2>Baustellen-Plan: ${location.code}</h2>
          <button class="modal__close" id="close-plan-modal">✕</button>
        </div>
        <div class="modal__body modal__body--plan">
          ${isPdf ? `
            <iframe src="${location.planFile}" class="plan-viewer plan-viewer--pdf" frameborder="0"></iframe>
          ` : isImage ? `
            <img src="${location.planFile}" alt="${location.planFileName || 'Baustellen-Plan'}" class="plan-viewer plan-viewer--image" />
          ` : `
            <div class="plan-viewer plan-viewer--file">
              <div class="plan-file-info">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="plan-file-name">${location.planFileName || "Baustellen-Plan"}</div>
                <a href="${location.planFile}" download="${location.planFileName || 'plan'}" class="btn btn--primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>Plan herunterladen</span>
                </a>
              </div>
            </div>
          `}
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--secondary" id="close-plan-btn">Schließen</button>
          ${!isPdf && !isImage ? `
            <a href="${location.planFile}" download="${location.planFileName || 'plan'}" class="btn btn--primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Herunterladen</span>
            </a>
          ` : ""}
        </div>
      </div>
    </div>
  `;
  
  const closeBtn = document.getElementById("close-plan-modal");
  const closeBtn2 = document.getElementById("close-plan-btn");
  const modal = document.getElementById("plan-view-modal");
  
  const close = () => {
    modalRoot.innerHTML = "";
  };
  
  if (closeBtn) {
    closeBtn.addEventListener("click", close);
  }
  
  if (closeBtn2) {
    closeBtn2.addEventListener("click", close);
  }
  
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        close();
      }
    });
  }
}

function highlightCalendarRange() {
  if (!uiState.dragStartCell || !uiState.dragEndCell) return;
  
  const startDay = uiState.dragStartCell.getAttribute("data-day");
  const endDay = uiState.dragEndCell.getAttribute("data-day");
  const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const startIdx = days.indexOf(startDay);
  const endIdx = days.indexOf(endDay);
  
  // Clear all highlights first
  document.querySelectorAll(".calendar__cell--drop").forEach((c) => {
    c.classList.remove("drop-range");
  });
  
  // Highlight range
  document.querySelectorAll(".calendar__cell--drop").forEach((cell) => {
    const cellDay = cell.getAttribute("data-day");
    const cellIdx = days.indexOf(cellDay);
    const sameRow = cell.getAttribute("data-worker-id") === uiState.dragStartCell.getAttribute("data-worker-id");
    
    if (sameRow) {
      if ((startIdx <= endIdx && cellIdx >= startIdx && cellIdx <= endIdx) ||
          (startIdx > endIdx && cellIdx <= startIdx && cellIdx >= endIdx)) {
        cell.classList.add("drop-range");
      }
    }
  });
}

function attachCalendarNavigationHandlers() {
  // Calendar navigation arrows
  document.querySelectorAll("[data-direction]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const direction = btn.getAttribute("data-direction");
      // Use selectedDay if available, otherwise use calendarDate
      const baseDate = uiState.selectedDay ? new Date(uiState.selectedDay) : new Date(uiState.calendarDate);
      const calDate = new Date(baseDate);
      
      switch (direction) {
        case "prev-year":
          calDate.setFullYear(calDate.getFullYear() - 1);
          break;
        case "next-year":
          calDate.setFullYear(calDate.getFullYear() + 1);
          break;
        case "prev-month":
          calDate.setMonth(calDate.getMonth() - 1);
          break;
        case "next-month":
          calDate.setMonth(calDate.getMonth() + 1);
          break;
        case "prev-week":
          calDate.setDate(calDate.getDate() - 7);
          break;
        case "next-week":
          calDate.setDate(calDate.getDate() + 7);
          break;
      }
      
      uiState.calendarDate = calDate;
      uiState.selectedDay = calDate; // Set selected day to the navigated date
      renderApp();
      
      // Scroll to top after navigation
      setTimeout(() => {
        const overviewCard = document.getElementById("today-overview-card");
        if (overviewCard) {
          overviewCard.scrollIntoView({ behavior: "smooth", block: "start" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 50);
    });
  });
  
  // Day selection
  document.querySelectorAll(".calendar-nav__day[data-date]").forEach((day) => {
    day.addEventListener("click", () => {
      const timestamp = parseInt(day.getAttribute("data-date"));
      const clickedDate = new Date(timestamp);
      uiState.calendarDate = clickedDate;
      // Set selected day to show details in overview
      uiState.selectedDay = clickedDate;
      renderApp();
      
      // Scroll to top of overview card after render
      setTimeout(() => {
        const overviewCard = document.getElementById("today-overview-card");
        if (overviewCard) {
          overviewCard.scrollIntoView({ behavior: "smooth", block: "start" });
          // Also scroll window to top if needed
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 50);
    });
  });
  
  // Close day details button
  const closeDayDetailsBtn = document.getElementById("btn-close-day-details");
  if (closeDayDetailsBtn) {
    closeDayDetailsBtn.addEventListener("click", () => {
      uiState.selectedDay = null;
      renderApp();
    });
  }
  
  // Today overview toggle
  const todayOverviewToggle = document.getElementById("today-overview-toggle");
  if (todayOverviewToggle) {
    todayOverviewToggle.addEventListener("click", () => {
      uiState.todayDetailsExpanded = !uiState.todayDetailsExpanded;
      renderApp();
    });
  }
  
  // Week navigation via event delegation (works for dynamically rendered elements)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-week-nav]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      navigateToWeek(btn.getAttribute("data-week-nav"));
    }
  });
  
  // Keyboard navigation for weeks (Arrow Left/Right) - with singleton pattern
  if (!window._weekKeyboardHandlerRegistered) {
    document.addEventListener('keydown', (e) => {
      // Only handle if we're in week view and no input is focused
      if (uiState.calendarViewMode === 'week' && 
          document.activeElement.tagName !== 'INPUT' && 
          document.activeElement.tagName !== 'TEXTAREA' &&
          !document.activeElement.isContentEditable &&
          !e.defaultPrevented) {
        if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          navigateToWeek('prev');
        } else if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          navigateToWeek('next');
        } else if (e.key === 'Home' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          navigateToWeek('today');
        }
      }
    });
    window._weekKeyboardHandlerRegistered = true;
  }
  
  // Calendar search functionality
  const calendarSearchInput = document.querySelector(".sidebar__search input");
  if (calendarSearchInput) {
    calendarSearchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      document.querySelectorAll(".person-card").forEach((card) => {
        const name = card.querySelector(".person-card__info span:first-child")?.textContent.toLowerCase() || "";
        const role = card.querySelector(".person-card__info span:nth-child(2)")?.textContent.toLowerCase() || "";
        if (name.includes(searchTerm) || role.includes(searchTerm)) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });
  }
}

function getDayName(date) {
  const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  return dayNames[date.getDay()];
}

function formatDateForDisplay(date) {
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  return `${date.getDate()}. ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

// Robuste formatDate und formatDateTime Funktionen (akzeptieren Date-Objekte und Strings)
function formatDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function slugifyStatus(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");
}

// Status Helper Functions
function getStatusLabel(status) {
  const statusLabels = {
    'PLANNED': 'Geplant',
    'CONFIRMED': 'Bestätigt',
    'REJECTED': 'Abgelehnt'
  };
  return statusLabels[status] || status || 'Geplant';
}

function getStatusClass(status) {
  return `status-badge--${slugifyStatus(status || 'PLANNED')}`;
}

// Calculate hours between two time strings (HH:MM format)
// FIX #2: Use centralized helper (deprecated, use durationMinutes instead)
function minutesBetween(timeFrom, timeTo) {
  return durationMinutes(timeFrom, timeTo);
}

// Utility function to normalize values for comparison (null-safe string conversion)
function norm(v) {
  return v == null ? null : String(v);
}

// Helper function to attach drag-and-drop handlers to elements
function attachDragDropHandlers(selector, options = {}) {
  const {
    onDrop = null,
    getLocationId = (el) => el.getAttribute("data-id") || el.getAttribute("data-location"),
    highlightFn = null
  } = options;
  
  document.querySelectorAll(selector).forEach((element) => {
    element.addEventListener("dragenter", (e) => {
      e.preventDefault();
      element.classList.add("drop-target");
    });
    element.addEventListener("dragover", (e) => e.preventDefault());
    element.addEventListener("dragleave", () => element.classList.remove("drop-target"));
    if (onDrop) {
      element.addEventListener("drop", async (e) => {
        e.preventDefault();
        element.classList.remove("drop-target");
        if (!uiState.draggedWorkerId) return;
        const locId = getLocationId(element);
        await onDrop(locId, uiState.draggedWorkerId);
        uiState.draggedWorkerId = null;
        renderApp();
      });
    }
  });
}

function getDayDetailsData(date) {
  const dayName = getDayName(date);
  
  // Find all workers working on this day (only once per worker)
  const workingWorkersMap = new Map();
  data.workers.forEach((worker) => {
    const daySlots = worker.availability.filter((slot) => slot.day === dayName);
    if (daySlots.length > 0 && !workingWorkersMap.has(worker.id)) {
      // Take the first slot for this worker on this day
      const firstSlot = daySlots[0];
      workingWorkersMap.set(worker.id, {
        worker: worker,
        slot: firstSlot,
        from: firstSlot.from,
        to: firstSlot.to,
        job: firstSlot.job,
        site: firstSlot.site
      });
    }
  });
  const workingWorkers = Array.from(workingWorkersMap.values());
  
  // Find all active job sites on this day (based on schedule or worker assignments)
  const activeLocations = [];
  data.locations.forEach((location) => {
    const hasWorkersToday = (location.crew || []).some((member) => {
      // Check if any worker in the crew has availability on this day
      const worker = data.workers.find((w) => w.name === member.name || w.id === member.id);
      if (worker) {
        return worker.availability.some((slot) => slot.day === dayName);
      }
      return false;
    });
    
    // Also check if location schedule overlaps with this day
    const schedule = location.schedule || {};
    let scheduleActive = false;
    if (schedule.start && schedule.end) {
      const startDate = new Date(schedule.start);
      const endDate = new Date(schedule.end);
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      scheduleActive = targetDate >= startDate && targetDate <= endDate;
    }
    
    if (hasWorkersToday || scheduleActive) {
      // Get workers assigned to this location for this day
      const locationWorkers = [];
      (location.crew || []).forEach((member) => {
        const worker = data.workers.find((w) => w.name === member.name || w.id === member.id);
        if (worker) {
          const daySlot = worker.availability.find((slot) => slot.day === dayName && slot.site === location.address);
          if (daySlot) {
            locationWorkers.push({
              worker: worker,
              slot: daySlot,
              time: member.time || `${daySlot.from} - ${daySlot.to}`
            });
          }
        }
      });
      
      activeLocations.push({
        location: location,
        workers: locationWorkers,
        schedule: schedule
      });
    }
  });
  
  return { dayName, workingWorkers, activeLocations };
}

function renderDayDetailsSection(date, dayTimeEntries = []) {
  if (!date) return "";
  
  const dateStr = date.toISOString().split('T')[0];
  const dayName = getDayName(date);
  
  // Get unique location IDs from time entries
  const locationIds = [...new Set(dayTimeEntries
    .filter(entry => entry.location_id)
    .map(entry => String(entry.location_id))
  )];
  
  // If no locations, show intern info
  if (locationIds.length === 0) {
    return `
      <div class="day-view__details-panel">
        <div class="day-details-panel__header">
          <h3>Intern / Ohne Baustelle</h3>
        </div>
        <div class="day-details-panel__body">
          <div class="intern-info-card">
            <div class="intern-info-icon">💼</div>
            <div class="intern-info-text">Keine Baustelle zugewiesen</div>
            <div class="intern-info-details">
              ${dayTimeEntries.length > 0 ? `
                <div class="intern-entries-summary">
                  ${dayTimeEntries.map(entry => {
                    const categoryLabels = {
                      'BUERO_ALLGEMEIN': 'Büro',
                      'KRANKHEIT': 'Krankheit',
                      'TRAINING': 'Training',
                      'PAUSE': 'Pause'
                    };
                    const categoryLabel = categoryLabels[entry.category] || entry.category || 'Unbekannt';
                    return `
                      <div class="intern-entry-item">
                        <span class="intern-entry-time">${entry.time_from || '—'}–${entry.time_to || '—'}</span>
                        <span class="intern-entry-category">${categoryLabel}</span>
                        <span class="intern-entry-hours">${getEntryHours(entry).toFixed(2)}h</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div class="intern-empty-state">
                  <p>Noch keine internen Zeiteinträge</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Get locations from data
  const locations = (data.locations || []).filter(loc => 
    locationIds.includes(String(loc.id)) || locationIds.includes(String(loc.location_id))
  );
  
  // If multiple locations, show dropdown selector
  // Don't override selectedLocationIdDayView if it's already set and valid
  let selectedLocationId = uiState.selectedLocationIdDayView;
  if (!selectedLocationId || !locationIds.includes(String(selectedLocationId))) {
    selectedLocationId = locationIds[0] || null;
    uiState.selectedLocationIdDayView = selectedLocationId;
  }
  const selectedLocation = selectedLocationId ? locations.find(loc => 
    String(loc.id) === String(selectedLocationId) || 
    String(loc.location_id) === String(selectedLocationId)
  ) : null;
  
  if (!selectedLocation) {
    return `
      <div class="day-view__details-panel">
        <div class="day-details-panel__header">
          <h3>Baustellen-Details</h3>
        </div>
        <div class="day-details-panel__body">
          <div class="empty-state">
            <p>Keine Baustelle ausgewählt</p>
          </div>
        </div>
      </div>
    `;
  }
  
  // Get time entries for selected location
  const locationEntries = dayTimeEntries.filter(entry => 
    String(entry.location_id) === String(selectedLocationId)
  );
  
  return `
    <div class="day-view__details-panel">
      <div class="day-details-panel__header">
        <h3>Baustellen-Details</h3>
        ${locations.length > 1 ? `
          <select class="day-location-selector" id="day-location-selector">
            ${locations.map(loc => `
              <option value="${loc.id || loc.location_id}" ${String(loc.id || loc.location_id) === String(selectedLocationId) ? 'selected' : ''}>
                ${loc.code || 'Unbekannt'} - ${loc.address || loc.title || ''}
              </option>
            `).join('')}
          </select>
        ` : ''}
      </div>
      <div class="day-details-panel__body">
        <div class="location-details-card">
          <div class="location-details__header">
            <div class="location-code">${selectedLocation.code || '—'}</div>
            <div class="location-title">${selectedLocation.title || selectedLocation.address || '—'}</div>
          </div>
          
          <div class="location-details__section">
            <h4>Baustellen-Informationen</h4>
            <div class="location-details__row">
              <span class="label">Adresse:</span>
              <span class="value">${selectedLocation.address || 'Nicht hinterlegt'}</span>
            </div>
            ${selectedLocation.start_address ? `
              <div class="location-details__row">
                <span class="label">Startadresse:</span>
                <span class="value">${selectedLocation.start_address}</span>
              </div>
            ` : ''}
            ${selectedLocation.description ? `
              <div class="location-details__row">
                <span class="label">Beschreibung:</span>
                <span class="value">${selectedLocation.description}</span>
              </div>
            ` : ''}
          </div>
          
          ${selectedLocation.team_leader_name || selectedLocation.team_leader_phone ? `
            <div class="location-details__section">
              <h4>Teamleiter</h4>
              ${selectedLocation.team_leader_name ? `
                <div class="location-details__row">
                  <span class="label">Name:</span>
                  <span class="value">${selectedLocation.team_leader_name}</span>
                </div>
              ` : ''}
              ${selectedLocation.team_leader_phone ? `
                <div class="location-details__row">
                  <span class="label">Telefon:</span>
                  <span class="value"><a href="tel:${selectedLocation.team_leader_phone}">${selectedLocation.team_leader_phone}</a></span>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${(() => {
            // PHASE 6: Calculate category totals using groupByCategory (SINGLE SOURCE OF TRUTH)
            const categoryTotals = groupByCategory(dayTimeEntries);
            
            const categoryLabels = {
              'BUERO_ALLGEMEIN': 'Büro',
              'ENTWICKLUNG': 'Entwicklung',
              'MEETING': 'Meeting',
              'KRANKHEIT': 'Krankheit',
              'TRAINING': 'Training',
              'PAUSE': 'Pause'
            };
            
            if (Object.keys(categoryTotals).length > 0) {
              return `
                <div class="location-details__section">
                  <h4>Kategorien / Aktivitäten</h4>
                  <div class="category-summary-list">
                    ${Object.entries(categoryTotals).map(([cat, hours]) => `
                      <div class="category-summary-item">
                        <span class="category-summary-label">${categoryLabels[cat] || cat}:</span>
                        <span class="category-summary-value">${hours.toFixed(2)}h</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }
            return '';
          })()}
          
          ${locationEntries.length > 0 ? `
            <div class="location-details__section">
              <h4>Zeiteinträge (${locationEntries.length})</h4>
              <div class="location-entries-list">
                ${locationEntries.map(entry => {
                  const categoryLabels = {
                    'BUERO_ALLGEMEIN': 'Büro',
                    'ENTWICKLUNG': 'Entwicklung',
                    'MEETING': 'Meeting',
                    'KRANKHEIT': 'Krankheit',
                    'TRAINING': 'Training',
                    'PAUSE': 'Pause'
                  };
                  const categoryLabel = categoryLabels[entry.category] || entry.category || 'Unbekannt';
                  
                  // Get location/project name for entry
                  const entryLocation = entry.location_id ? data.locations.find(l => l.id === entry.location_id) : null;
                  const projectName = entryLocation ? (entryLocation.code || entryLocation.address || 'Projekt') : 'Intern';
                  
                  // Status Badge
                  const status = entry.status || 'PLANNED';
                  const statusLabels = {
                    'PLANNED': 'Geplant',
                    'CONFIRMED': 'Bestätigt',
                    'REJECTED': 'Abgelehnt'
                  };
                  const statusLabel = statusLabels[status] || status;
                  const statusBadge = `<span class="status-badge status-badge--${slugifyStatus(status)}" title="Status: ${statusLabel}">${statusLabel}</span>`;
                  
                  // Confirm/Reject Buttons (nur Mitarbeiter, nur eigene, nur PLANNED)
                  const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
                  const isOwnEntry = entry.user_id === data.currentUser?.id || entry.worker_id === getActiveWorkerId();
                  const showConfirmReject = !isAdmin && isOwnEntry && status === 'PLANNED';
                  const confirmRejectButtons = showConfirmReject ? `
                    <div class="entry-actions">
                      <button class="btn-confirm-entry" data-action="timeentry-confirm" data-entry-id="${entry.id}" title="Bestätigen">✓ Bestätigen</button>
                      <button class="btn-reject-entry" data-action="timeentry-reject" data-entry-id="${entry.id}" title="Ablehnen">✗ Ablehnen</button>
                    </div>
                  ` : '';
                  
                  return `
                    <div class="location-entry-item">
                      <div class="entry-row entry-row--header">
                        <span class="entry-project">${projectName}</span>
                        ${statusBadge}
                      </div>
                      <div class="entry-row entry-row--details">
                        <span class="entry-time">${entry.time_from || '—'}–${entry.time_to || '—'}</span>
                        <span class="entry-category">${categoryLabel}</span>
                        <span class="entry-hours">${entryHours(entry).toFixed(2)}h</span>
                      </div>
                      ${entry.notes ? `
                        <div class="entry-row entry-row--notes" title="${entry.notes}">
                          ${entry.notes.length > 60 ? entry.notes.substring(0, 60) + '...' : entry.notes}
                        </div>
                      ` : ''}
                      ${confirmRejectButtons}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function calculateTotalHours(workingWorkers) {
  let totalMinutes = 0;
  workingWorkers.forEach(({ from, to }) => {
    const [fromHours, fromMins] = from.split(":").map(Number);
    const [toHours, toMins] = to.split(":").map(Number);
    const fromTotal = fromHours * 60 + fromMins;
    const toTotal = toHours * 60 + toMins;
    totalMinutes += toTotal - fromTotal;
  });
  const hours = Math.floor(totalMinutes / 60);
  return `${hours}h`;
}

// Event delegation for management handlers (bound once)
let managementHandlersBound = false;

function bindManagementHandlers() {
  if (!data.currentUser.permissions.includes("manage_users")) return;
  if (managementHandlersBound) return;
  managementHandlersBound = true;

  // Role select via event delegation
  document.addEventListener("change", (e) => {
    const select = e.target.closest(".role-select");
    if (select) {
      const userId = select.getAttribute("data-role-select");
      updateUserRole(userId, e.target.value);
      renderApp();
    }
  });

  // Button clicks via event delegation
  document.addEventListener("click", (e) => {
    const target = e.target.closest("button, [data-edit-team], [data-edit-user], [data-change-password]");
    if (!target) return;
    
    if (target.id === "btn-add-worker") {
      openAddWorkerModal();
    } else if (target.id === "btn-add-location") {
      openAddLocationModal();
    } else if (target.id === "btn-add-team") {
      openAddTeamModal();
    } else if (target.hasAttribute("data-edit-team")) {
      const teamId = target.getAttribute("data-edit-team");
      openEditTeamModal(teamId);
    } else if (target.hasAttribute("data-edit-user")) {
      const userId = target.getAttribute("data-edit-user");
      openEditUserModal(userId);
    } else if (target.hasAttribute("data-change-password")) {
      const userId = target.getAttribute("data-change-password");
      openAdminPasswordChangeModal(userId);
    } else if (target.hasAttribute("data-edit-location")) {
      const locationId = target.getAttribute("data-edit-location");
      openEditLocationModal(locationId);
    }
  });

  // Permission toggles via event delegation
  document.addEventListener("change", (e) => {
    const checkbox = e.target.closest("[data-permission-toggle]");
    if (checkbox) {
      const userId = checkbox.getAttribute("data-permission-toggle");
      const perm = checkbox.value;
      toggleUserPermission(userId, perm, e.target.checked);
    }
  });

  document.querySelectorAll("[data-edit-location]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const locationId = btn.getAttribute("data-edit-location");
      openEditLocationModal(locationId);
    });
  });
}

function updateUserRole(userId, newRole) {
  const user = data.users.find((u) => u.id === userId);
  if (!user || !ROLE_PRESETS[newRole]) return;
  user.role = newRole;
  user.permissions = [...ROLE_PRESETS[newRole].permissions];
}

function toggleUserPermission(userId, permission, enabled) {
  const user = data.users.find((u) => u.id === userId);
  if (!user) return;
  if (enabled) {
    if (!user.permissions.includes(permission)) {
      user.permissions.push(permission);
    }
  } else {
    user.permissions = user.permissions.filter((perm) => perm !== permission);
  }
}

function formatTodayDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date || uiState.calendarDate);
  targetDate.setHours(0, 0, 0, 0);
  
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const day = targetDate.getDate();
  const month = monthNames[targetDate.getMonth()];
  const year = targetDate.getFullYear();
  
  const isToday = targetDate.getTime() === today.getTime();
  const label = isToday ? `Heute ${day}. ${month} ${year}` : `${day}. ${month} ${year}`;
  
  return `<span>${label}</span>`;
}

function formatLastLogin(lastLoginString) {
  // Parse the stored format: "DD.MM.YYYY HH:MM" or existing format "DD.MM.YYYY HH:MM"
  // Convert to readable format: "DD. Month YYYY, HH:MM Uhr"
  if (!lastLoginString) return "—";
  
  try {
    // Handle format like "12.11.2025 08:15" or "12.11.2025 08:15"
    const parts = lastLoginString.split(" ");
    if (parts.length >= 2) {
      const datePart = parts[0]; // "DD.MM.YYYY"
      const timePart = parts[1]; // "HH:MM"
      
      const [day, month, year] = datePart.split(".");
      const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
      const monthName = monthNames[parseInt(month) - 1] || month;
      
      return `${parseInt(day)}. ${monthName} ${year}, ${timePart} Uhr`;
    }
    
    // Fallback: return as-is if format is unexpected
    return lastLoginString;
  } catch (e) {
    return lastLoginString;
  }
}

function renderActiveView() {
  // PHASE 3: Check workflowState.viewMode first (team calendar)
  if (workflowState.viewMode === 'team') {
    return renderTeamCalendar();
  }
  
  // Legacy: check uiState.calendarViewMode
  if (uiState.calendarViewMode === 'team-calendar') {
    return renderTeamCalendar();
  }
  // Dashboards (workers/teams/sites) wurden entfernt – immer Kalender rendern
  return renderCalendarView();
}

function getTodayActiveData() {
  // Use selected date or default to calendarDate (which defaults to today)
  let selectedDate;
  if (uiState.selectedDay) {
    selectedDate = new Date(uiState.selectedDay);
  } else {
    // Default to today if no day is selected
    selectedDate = new Date();
  }
  selectedDate.setHours(0, 0, 0, 0);
  
  // Update calendarDate to match if not set
  if (!uiState.selectedDay) {
    uiState.calendarDate = selectedDate;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = selectedDate.getTime() === today.getTime();
  
  const selectedDayName = getDayName(selectedDate);
  
  // Get all workers working on selected day
  const activeWorkersToday = [];
  const locationWorkersMap = {}; // Map location ID to workers
  
  // Filter workers based on permissions and exclude teams
  let workersToCheck = data.workers;
  workersToCheck = filterIndividualWorkers(workersToCheck);
  const viewAll = data.currentUser && data.currentUser.permissions && data.currentUser.permissions.includes("view_all");
  
  if (!viewAll && data.currentUser && data.currentUser.workerId) {
    // Worker can only see their own data - filter to only their worker ID
    workersToCheck = workersToCheck.filter(w => w.id === data.currentUser.workerId);
  }
  
  // Process workers and their assignments
  workersToCheck.forEach((worker) => {
    // Get assignments for this specific date
    const daySlots = worker.availability.filter((slot) => {
      // Match by day name
      if (slot.day === selectedDayName) {
        // If slot has a date, check if it matches the selected date
        if (slot.date) {
          const slotDate = new Date(slot.date);
          slotDate.setHours(0, 0, 0, 0);
          return slotDate.getTime() === selectedDate.getTime();
        }
        // If no date, match by day name (for recurring assignments)
        return true;
      }
      return false;
    });
    
    if (daySlots.length > 0 && worker.status === "Arbeitsbereit") {
      daySlots.forEach((slot) => {
        // Find location by address, code, or site
        const location = data.locations.find((loc) => 
          loc.address === slot.site || 
          loc.code === slot.site ||
          loc.id === slot.locationId
        );
        if (location) {
          if (!locationWorkersMap[location.id]) {
            locationWorkersMap[location.id] = {
              location: location,
              workers: []
            };
          }
          // Check if worker already added for this location
          const existing = locationWorkersMap[location.id].workers.find(
            (w) => w.worker.id === worker.id
          );
          if (!existing) {
            locationWorkersMap[location.id].workers.push({
              worker: worker,
              slot: slot,
              time: `${slot.from} - ${slot.to}`,
              job: slot.job || "Einsatz"
            });
            activeWorkersToday.push(worker);
          }
        }
      });
    }
  });
  
  // Also check location crew directly for users without view_all
  // This ensures that if a worker is assigned but not in the filtered list, they still see their assignments
  if (!viewAll && data.currentUser && data.currentUser.workerId) {
    data.locations.forEach((location) => {
      if (location.crew && Array.isArray(location.crew)) {
        const crewForDate = location.crew.filter(c => {
          // Check if crew member matches current user's worker ID
          // Try multiple ways to match: worker_id, id, or name
          const matchesWorker = 
            c.worker_id === data.currentUser.workerId || 
            c.id === data.currentUser.workerId ||
            (c.name && data.workers.find(w => w.id === data.currentUser.workerId && w.name === c.name));
          
          if (!matchesWorker) return false;
          
          // Check if assignment is for the selected date
          if (c.date) {
            const crewDate = new Date(c.date);
            crewDate.setHours(0, 0, 0, 0);
            return crewDate.getTime() === selectedDate.getTime();
          }
          // If no date, check by day name - get day name from selected date
          return true; // Show if no date specified (for backward compatibility)
        });
        
        if (crewForDate.length > 0) {
          const worker = data.workers.find(w => w.id === data.currentUser.workerId);
          if (worker) {
            if (!locationWorkersMap[location.id]) {
              locationWorkersMap[location.id] = {
                location: location,
                workers: []
              };
            }
            
            crewForDate.forEach((crewMember) => {
              const existing = locationWorkersMap[location.id].workers.find(
                (w) => w.worker.id === worker.id
              );
              if (!existing) {
                // Parse time from crew member
                let timeFrom = '07:00';
                let timeTo = '16:00';
                if (crewMember.time) {
                  const timeParts = crewMember.time.split(' - ');
                  if (timeParts.length === 2) {
                    timeFrom = timeParts[0].trim();
                    timeTo = timeParts[1].trim();
                  }
                }
                
                locationWorkersMap[location.id].workers.push({
                  worker: worker,
                  slot: { from: timeFrom, to: timeTo },
                  time: crewMember.time || '07:00 - 16:00',
                  job: "Einsatz"
                });
                if (!activeWorkersToday.find(w => w.id === worker.id)) {
                  activeWorkersToday.push(worker);
                }
              }
            });
          }
        }
      }
    });
  }
  
  // Remove duplicates from activeWorkersToday
  const uniqueActiveWorkers = Array.from(
    new Map(activeWorkersToday.map((w) => [w.id, w])).values()
  );
  
  return {
    todayName: isToday ? `Heute - ${selectedDayName}` : selectedDayName,
    todayDate: selectedDate,
    isToday: isToday,
    activeWorkersCount: uniqueActiveWorkers.length,
    activeWorkers: uniqueActiveWorkers,
    locationWorkersMap: locationWorkersMap,
    activeLocations: Object.values(locationWorkersMap)
  };
}

function getWeekData(date) {
  const selectedDate = date || new Date();
  selectedDate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get week start (Monday) for the selected date
  const weekStart = new Date(selectedDate);
  const dayOfWeek = selectedDate.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(selectedDate.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  // Generate week days (Monday to Sunday)
  const weekDays = [];
  const dayNamesShort = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const dayNamesFull = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dayNum = date.getDate();
    const isToday = date.getTime() === today.getTime();
    const dayName = dayNamesFull[i];
    
    // Count workers for this day (filtered by permissions)
    let workersToCount = data.workers;
    if (data.currentUser && !data.currentUser.permissions.includes("view_all")) {
      if (data.currentUser.workerId) {
        workersToCount = data.workers.filter(w => w.id === data.currentUser.workerId);
      } else {
        workersToCount = [];
      }
    }
    const workerCount = workersToCount.filter((worker) => {
      return worker.availability.some((slot) => slot.day === dayName && worker.status === "Arbeitsbereit");
    }).length;
    
    weekDays.push({
      day: dayNamesFull[i],
      dayShort: dayNamesShort[i],
      date: date,
      dayNum: dayNum,
      isToday: isToday,
      workerCount: workerCount
    });
  }
  
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const weekLabel = `KW ${getWeekNumber(weekStart)} - ${weekStart.getDate()}. ${monthNames[weekStart.getMonth()]} - ${weekDays[6].dayNum}. ${monthNames[weekDays[6].date.getMonth()]} ${weekStart.getFullYear()}`;
  
  return {
    weekStart: weekStart,
    weekLabel: weekLabel,
    days: weekDays
  };
}

function getWeekNumber(date) {
  // ISO 8601 week number calculation
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function renderCalendarNavigation() {
  const calDate = uiState.calendarDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Use selectedDay if available, otherwise use calendarDate
  const selectedDate = uiState.selectedDay ? new Date(uiState.selectedDay) : calDate;
  selectedDate.setHours(0, 0, 0, 0);
  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getDate()}. ${["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][tomorrow.getMonth()]} ${tomorrow.getFullYear()}`;
  
  // Get week start (Monday) for the selected date
  const weekStart = new Date(selectedDate);
  const dayOfWeek = selectedDate.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(selectedDate.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  // Generate full week (Monday to Sunday)
  const fullWeek = [];
  const dayNamesShort = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dayName = dayNamesShort[i];
    const dayNum = date.getDate();
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const isToday = dateOnly.getTime() === today.getTime();
    const isSelected = dateOnly.getTime() === selectedDateOnly.getTime();
    fullWeek.push({ day: dayName, num: dayNum, date: date, isToday, isSelected });
  }
  
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const displayDate = selectedDate || calDate;
  const currentMonthYear = `${monthNames[displayDate.getMonth()]} ${displayDate.getFullYear()}`;
  const weekNumber = getWeekNumber(weekStart);
  const weekLabel = `KW ${weekNumber}`;
  
  return `
    <div class="calendar-nav">
      <div class="calendar-nav__left">
        <span class="calendar-nav__label">Morgen</span>
        <span class="calendar-nav__date">${tomorrowStr}</span>
      </div>
      <div class="calendar-nav__center">
        <button class="calendar-nav__arrow calendar-nav__arrow--year" data-direction="prev-year" title="Vorheriges Jahr">‹‹</button>
        <button class="calendar-nav__arrow calendar-nav__arrow--month" data-direction="prev-month" title="Vorheriger Monat">‹</button>
        <div class="calendar-nav__month-year">${currentMonthYear}</div>
        <button class="calendar-nav__arrow calendar-nav__arrow--month" data-direction="next-month" title="Nächster Monat">›</button>
        <button class="calendar-nav__arrow calendar-nav__arrow--year" data-direction="next-year" title="Nächstes Jahr">››</button>
        <div class="calendar-nav__week-info">
          <span class="calendar-nav__week-label">${weekLabel}</span>
        </div>
        <div class="calendar-nav__days">
          ${fullWeek.map((wd, idx) => `
            <div class="calendar-nav__day ${wd.isSelected ? "calendar-nav__day--active" : ""} ${wd.isToday ? "calendar-nav__day--today" : ""}" data-day-index="${idx}" data-date="${wd.date.getTime()}">
              <span class="calendar-nav__day-name">${wd.day}</span>
              <span class="calendar-nav__day-num">${wd.num}</span>
            </div>
          `).join("")}
        </div>
        <button class="calendar-nav__arrow calendar-nav__arrow--week" data-direction="prev-week" title="Vorherige Woche">‹</button>
        <button class="calendar-nav__arrow calendar-nav__arrow--week" data-direction="next-week" title="Nächste Woche">›</button>
      </div>
      <div class="calendar-nav__right">
      </div>
    </div>
  `;
}

function renderProjectCard(loc) {
  // Get all workers assigned to this location from availability (linked with calendar)
  const today = new Date();
  const todayName = getDayName(today);
  
  const assignedWorkers = data.workers.filter((worker) => {
    return worker.availability.some((slot) => 
      slot.day === todayName && slot.site === loc.address && worker.status === "Arbeitsbereit"
    );
  }).map((worker) => {
    const slot = worker.availability.find((s) => s.day === todayName && s.site === loc.address);
    return {
      id: worker.id,
      name: worker.name,
      role: worker.role,
      time: slot ? `${slot.from} - ${slot.to}` : "07:00 - 16:00",
      job: slot?.job || "Einsatz"
    };
  });
  
  const crew = loc.crew || [];
  const crewCount = Math.max(assignedWorkers.length, crew.length);
  
  return `
    <article class="project-card" data-location="${loc.id}">
      <div class="project-card__header">
        <div class="project-card__title-group">
          <div class="project-card__code">${loc.code}</div>
          ${loc.address ? `<div class="project-card__address">${loc.address}</div>` : ""}
        </div>
        <button class="project-card__menu">⋯</button>
      </div>
      ${loc.description && loc.description !== "—" ? `
        <div class="project-card__task">${loc.description}</div>
      ` : ""}
      <div class="project-card__personnel">
        <div class="personnel-header">
          <span class="personnel-icon">👤</span>
          <span>Personal ${assignedWorkers.length > 0 ? `(Heute: ${assignedWorkers.length})` : ""}</span>
          <span class="personnel-count">${crewCount}</span>
          <button class="personnel-add">📄+</button>
        </div>
        <div class="personnel-list">
          ${assignedWorkers.length > 0 ? assignedWorkers.map((member) => `
            <div class="personnel-item">
              <span class="personnel-item__icon">👤</span>
              <div class="personnel-item__info">
                <span class="personnel-item__name">${member.name}</span>
                ${member.role ? `<span class="personnel-item__role">${member.role}</span>` : ""}
                <span class="personnel-item__time">🕐 ${member.time}</span>
                <span class="personnel-item__job">📋 ${member.job}</span>
              </div>
              <button class="personnel-item__menu">⋯</button>
            </div>
          `).join("") : `
            <div class="personnel-empty">Keine Personen zugewiesen (heute)</div>
          `}
        </div>
      </div>
    </article>
  `;
}

// renderActiveView() wurde nach oben verschoben (siehe Zeile 3686)

function renderCalendarView() {
  // Route to appropriate view based on calendarViewMode
  const viewMode = uiState.calendarViewMode || 'week';

  if (viewMode === 'year') {
    return renderYearView();
  }
  
  if (viewMode === 'month') {
    return renderMonthView();
  }
  
  if (viewMode === 'day') {
    return renderDayView();
  }
  
  // Default: week view - use WeekTimeGrid
  return renderWeekTimeGrid();
}

// ============================================
// Week Time Grid Component
// ============================================

// Centralized week navigation function with proper date validation
function navigateToWeek(direction) {
  // Validate and normalize calendarDate
  let currentDate;
  if (uiState.calendarDate instanceof Date) {
    currentDate = new Date(uiState.calendarDate);
  } else if (typeof uiState.calendarDate === 'string') {
    currentDate = new Date(uiState.calendarDate);
  } else {
    currentDate = new Date();
  }
  
  // Validate date
  if (isNaN(currentDate.getTime())) {
    currentDate = new Date();
  }
  
  currentDate.setHours(0, 0, 0, 0);
  
  // Calculate current week start (Monday)
  const dayOfWeek = currentDate.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekStart = new Date(currentDate);
  currentWeekStart.setDate(currentDate.getDate() - daysFromMonday);
  currentWeekStart.setHours(0, 0, 0, 0);
  
  let targetWeekStart;
  
  if (direction === "prev") {
    // Go to previous week (7 days before current week start)
    targetWeekStart = new Date(currentWeekStart);
    targetWeekStart.setDate(currentWeekStart.getDate() - 7);
  } else if (direction === "next") {
    // Go to next week (7 days after current week start)
    targetWeekStart = new Date(currentWeekStart);
    targetWeekStart.setDate(currentWeekStart.getDate() + 7);
  } else if (direction === "today") {
    // Go to current week (week containing today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDayOfWeek = today.getDay();
    const todayDaysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
    targetWeekStart = new Date(today);
    targetWeekStart.setDate(today.getDate() - todayDaysFromMonday);
    targetWeekStart.setHours(0, 0, 0, 0);
  } else {
    // Default: stay on current week
    targetWeekStart = currentWeekStart;
  }
  
  // Set calendar date to Monday of target week
  uiState.calendarDate = targetWeekStart;
  
  // Render app first, then reset scroll after DOM is ready
  renderApp();
  
  // Use requestAnimationFrame to ensure DOM is ready before scrolling
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const timeAxisSlots = document.querySelector('.time-axis__slots');
      const slotsContainer = document.querySelector('.week-time-grid__slots-container');
      if (timeAxisSlots) timeAxisSlots.scrollTop = 0;
      if (slotsContainer) slotsContainer.scrollTop = 0;
      
      // Setup scroll synchronization after reset
      setupScrollSynchronization();
    });
  });
}

  // PHASE 3: Render Team Calendar (NEW WORKFLOW - Single Source of Truth)
function renderTeamCalendar() {
  const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
  if (!isAdmin) {
    return '<div class="error-message">Nur Administratoren können den Teamkalender öffnen.</div>';
  }
  
  // Use workflowState cache (loaded via loadTeamWeek)
  const teamData = workflowState.cache.teamData;
  if (!teamData) {
    return '<section class="team-calendar-container"><div class="team-calendar__empty">Keine Daten verfügbar.</div></section>';
  }

  const users = teamData.users || [];
  const entries = teamData.entries || [];

  if (!users.length && !entries.length) {
    return '<section class="team-calendar-container"><div class="team-calendar__empty">Keine Daten verfügbar.</div></section>';
  }

  // Get week range from workflowState
  const weekStartStr = workflowState.selectedWeekStart || teamData.date_from;
  if (!weekStartStr) {
    return '<section class="team-calendar-container"><div class="team-calendar__empty">Keine Woche ausgewählt.</div></section>';
  }

  const weekStart = new Date(weekStartStr);
  if (isNaN(weekStart.getTime())) {
    return '<section class="team-calendar-container"><div class="team-calendar__empty">Ungültiges Datum.</div></section>';
  }
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  // Generate week days
  const weekDays = [];
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dateStr = day.toISOString().split('T')[0];
    weekDays.push({
      date: new Date(day),
      dateStr: dateStr,
      dayName: dayNames[i],
      dayNum: day.getDate(),
      month: monthNames[day.getMonth()]
    });
  }
  
  // Group entries by user_id and date (SINGLE SOURCE OF TRUTH)
  const entriesByUserDay = {};
  entries.forEach(entry => {
    // Nur Einträge mit gültigem Owner (user_id) berücksichtigen
    const userId = entry.user_id;
    if (!userId) {
      return;
    }
    const date = entry.date || entry.entryDate || entry.entry_date;
    if (!date) return;
    const key = `${userId}_${date}`;
    if (!entriesByUserDay[key]) {
      entriesByUserDay[key] = [];
    }
    entriesByUserDay[key].push(entry);
  });
  
  // Status badge helper
  const getStatusBadge = (status) => {
    if (status === 'CONFIRMED') return '<span class="status-badge status-badge--confirmed">✓ Bestätigt</span>';
    if (status === 'PLANNED') return '<span class="status-badge status-badge--planned">📋 Geplant</span>';
    if (status === 'REJECTED') return '<span class="status-badge status-badge--rejected">✗ Abgelehnt</span>';
    return '';
  };
  
  // Navigation helper
  const navigateWeek = (direction) => {
    const currentWeekStart = new Date(workflowState.selectedWeekStart || weekStartStr);
    if (direction === 'prev') {
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    } else if (direction === 'next') {
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    } else if (direction === 'today') {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentWeekStart.setTime(today.getTime());
      currentWeekStart.setDate(today.getDate() - daysFromMonday);
    }
    const newWeekStartStr = currentWeekStart.toISOString().split('T')[0];
    workflowState.selectedWeekStart = newWeekStartStr;
    loadTeamWeek(newWeekStartStr).then(() => renderApp());
  };
  
  return `
    <section class="team-calendar-container">
      <div class="team-calendar__header">
        <div class="team-calendar__header-left">
          <button class="btn-secondary" data-action="close-team-calendar" title="Zurück zum Kalender">
            ← Zurück
          </button>
          <h2 class="team-calendar__title">Teamkalender</h2>
          <div class="team-calendar__week-info">
            KW ${getWeekNumber(weekStart)} - ${weekStart.getDate()}. ${monthNames[weekStart.getMonth()]} - ${weekEnd.getDate()}. ${monthNames[weekEnd.getMonth()]} ${weekStart.getFullYear()}
          </div>
        </div>
        <div class="team-calendar__header-right">
          <button class="btn-week-nav" data-week-nav="prev" onclick="navigateTeamWeek('prev')">‹</button>
          <button class="btn-week-nav" data-week-nav="today" onclick="navigateTeamWeek('today')">Heute</button>
          <button class="btn-week-nav" data-week-nav="next" onclick="navigateTeamWeek('next')">›</button>
        </div>
      </div>
      
      <div class="team-calendar__grid">
        <div class="team-calendar__grid-header">
          <div class="team-calendar__user-col">Mitarbeiter</div>
          ${weekDays.map(day => `
            <div class="team-calendar__day-col">
              <div class="team-calendar__day-name">${day.dayName}</div>
              <div class="team-calendar__day-date">${day.dayNum}. ${day.month}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="team-calendar__grid-body">
          ${users.map(user => {
            const userEntriesByDay = {};
            weekDays.forEach(day => {
              const key = `${user.id}_${day.dateStr}`;
              userEntriesByDay[day.dateStr] = entriesByUserDay[key] || [];
            });
            
            return `
              <div class="team-calendar__row">
                <div class="team-calendar__user-cell">
                  <div class="team-calendar__user-name">${user.name}</div>
                  <div class="team-calendar__user-initials">${user.initials || ''}</div>
                </div>
                ${weekDays.map(day => {
                  const dayEntries = userEntriesByDay[day.dateStr] || [];
                  const visibleEntries = dayEntries.slice(0, 2);
                  const moreCount = dayEntries.length - 2;
                  
                  return `
                    <div class="team-calendar__cell" data-user-id="${user.id}" data-date="${day.dateStr}">
                      ${dayEntries.length > 0 ? `
                        <div class="team-calendar__entries">
                          ${visibleEntries.map(entry => {
                            const hours = entryHours(entry); // SINGLE SOURCE OF TRUTH
                            const projectLabel = entry.project_name || entry.project_code || entry.category || '—';
                            return `
                              <div class="team-calendar__entry" data-entry-id="${entry.id}">
                                <div class="team-calendar__entry-time">${entry.time_from || '—'}–${entry.time_to || '—'}</div>
                                <div class="team-calendar__entry-project">${projectLabel}</div>
                                <div class="team-calendar__entry-hours">${hours.toFixed(2)}h</div>
                                ${getStatusBadge(entry.status)}
                              </div>
                            `;
                          }).join('')}
                          ${moreCount > 0 ? `<div class="team-calendar__entry-more">+${moreCount} weitere</div>` : ''}
                        </div>
                      ` : '<div class="team-calendar__cell-empty">—</div>'}
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

// PHASE 3: Team calendar week navigation
function navigateTeamWeek(direction) {
  const currentWeekStart = new Date(workflowState.selectedWeekStart || new Date());
  if (direction === 'prev') {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  } else if (direction === 'next') {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  } else if (direction === 'today') {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setTime(today.getTime());
    currentWeekStart.setDate(today.getDate() - daysFromMonday);
  }
  currentWeekStart.setHours(0, 0, 0, 0);
  const newWeekStartStr = currentWeekStart.toISOString().split('T')[0];
  workflowState.selectedWeekStart = newWeekStartStr;
  loadTeamWeek(newWeekStartStr).then(() => renderApp());
}

// Scroll synchronization for time axis and calendar content
function setupScrollSynchronization() {
  const timeAxisSlots = document.querySelector('.time-axis__slots');
  const slotsContainer = document.querySelector('.week-time-grid__slots-container');
  
  if (!timeAxisSlots || !slotsContainer) return;
  
  // Clean up existing handlers to prevent duplicates
  if (timeAxisSlots._scrollHandler) {
    timeAxisSlots.removeEventListener('scroll', timeAxisSlots._scrollHandler);
  }
  if (slotsContainer._scrollHandler) {
    slotsContainer.removeEventListener('scroll', slotsContainer._scrollHandler);
  }
  if (timeAxisSlots._wheelHandler) {
    timeAxisSlots.removeEventListener('wheel', timeAxisSlots._wheelHandler, { passive: true });
  }
  if (slotsContainer._wheelHandler) {
    slotsContainer.removeEventListener('wheel', slotsContainer._wheelHandler, { passive: true });
  }
  
  // Clear existing interval if any
  if (window._scrollSyncInterval) {
    clearInterval(window._scrollSyncInterval);
  }
  
  let isSyncing = false;
  
  // Synchronize scroll from time axis to slots container
  timeAxisSlots._scrollHandler = () => {
    if (isSyncing) return;
    isSyncing = true;
    slotsContainer.scrollTop = timeAxisSlots.scrollTop;
    requestAnimationFrame(() => { isSyncing = false; });
  };
  
  // Synchronize scroll from slots container to time axis
  slotsContainer._scrollHandler = () => {
    if (isSyncing) return;
    isSyncing = true;
    timeAxisSlots.scrollTop = slotsContainer.scrollTop;
    requestAnimationFrame(() => { isSyncing = false; });
  };
  
  // Wheel event handlers for better synchronization
  timeAxisSlots._wheelHandler = (e) => {
    if (isSyncing) return;
    isSyncing = true;
    slotsContainer.scrollTop += e.deltaY;
    requestAnimationFrame(() => { isSyncing = false; });
  };
  
  slotsContainer._wheelHandler = (e) => {
    if (isSyncing) return;
    isSyncing = true;
    timeAxisSlots.scrollTop += e.deltaY;
    requestAnimationFrame(() => { isSyncing = false; });
  };
  
  // Attach event listeners
  timeAxisSlots.addEventListener('scroll', timeAxisSlots._scrollHandler);
  slotsContainer.addEventListener('scroll', slotsContainer._scrollHandler);
  timeAxisSlots.addEventListener('wheel', timeAxisSlots._wheelHandler, { passive: true });
  slotsContainer.addEventListener('wheel', slotsContainer._wheelHandler, { passive: true });
  
  // Fallback: Periodic synchronization check (60fps)
  window._scrollSyncInterval = setInterval(() => {
    if (!isSyncing && timeAxisSlots && slotsContainer) {
      const diff = Math.abs(timeAxisSlots.scrollTop - slotsContainer.scrollTop);
      if (diff > 1) {
        isSyncing = true;
        const avg = (timeAxisSlots.scrollTop + slotsContainer.scrollTop) / 2;
        timeAxisSlots.scrollTop = avg;
        slotsContainer.scrollTop = avg;
        requestAnimationFrame(() => { isSyncing = false; });
      }
    }
  }, 16); // ~60fps
}

// Helper functions for Week Time Grid
function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStartDate(date) {
  const weekStart = new Date(date);
  const dayOfWeek = date.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(date.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function generateWeekDays(weekStart) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayNamesShort = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const dayNamesFull = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const dayNum = date.getDate();
    const isToday = date.getTime() === today.getTime();
    const dateStr = formatDateLocal(date);
    weekDays.push({
      day: dayNamesFull[i],
      dayShort: dayNamesShort[i],
      date: date,
      dateStr: dateStr,
      dayNum: dayNum,
      month: monthNames[date.getMonth()],
      isToday: isToday,
      timestamp: date.getTime()
    });
  }
  return weekDays;
}

function generateTimeSlots() {
  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const minutes = hour * 60 + minute;
      timeSlots.push({
        hour,
        minute,
        minutes,
        display: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        isHour: minute === 0
      });
    }
  }
  return timeSlots;
}

function getWeekTimeEntries(weekStartStr, weekEndStr, activeWorkerId, activeUserId) {
  // Use calendarViewUserId for viewing (admin can view other users' calendars)
  const viewUserId = getCalendarViewUserId();
  const viewUser = viewUserId ? data.users.find(u => u.id === viewUserId) : null;
  const viewWorkerId = viewUser?.workerId || null;
  const viewUserIdFinal = viewUserId || null;
  
  return viewWorkerId ? (data.timeEntries || []).filter(entry => {
    return entry.worker_id === viewWorkerId &&
           entry.entry_date >= weekStartStr &&
           entry.entry_date <= weekEndStr;
  }) : (data.timeEntries || []).filter(entry => {
    return entry.user_id === viewUserIdFinal &&
           entry.entry_date >= weekStartStr &&
           entry.entry_date <= weekEndStr;
  });
}

function renderWeekTimeGrid() {
  const calDate = uiState.calendarDate || new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Ensure calDate is properly initialized and validated
  let currentDate;
  if (calDate instanceof Date) {
    currentDate = new Date(calDate);
  } else if (typeof calDate === 'string') {
    currentDate = new Date(calDate);
  } else {
    currentDate = new Date();
  }
  
  if (isNaN(currentDate.getTime())) {
    currentDate = new Date();
  }
  
  currentDate.setHours(0, 0, 0, 0);
  
  // Get week start (Monday)
  const weekStart = getWeekStartDate(currentDate);
  
  // Check if current week is being displayed
  const todayWeekStart = getWeekStartDate(today);
  const isCurrentWeek = weekStart.getTime() === todayWeekStart.getTime();
  
  // Generate week days
  const weekDays = generateWeekDays(weekStart);
  
  // Get week number and label
  const weekNumber = getWeekNumber(weekStart);
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const weekLabel = `KW ${weekNumber} - ${weekStart.getDate()}. ${monthNames[weekStart.getMonth()]} - ${weekDays[6].dayNum}. ${monthNames[weekDays[6].date.getMonth()]} ${weekStart.getFullYear()}`;
  
  // Time range for grid
  const timeStartHour = 0;
  const timeEndHour = 24;
  
  // Generate time slots
  const timeSlots = generateTimeSlots();
  
  // Get active user for viewing (use calendarViewUserId if set)
  const viewUserId = getCalendarViewUserId();
  const viewUser = viewUserId ? data.users.find(u => u.id === viewUserId) : data.currentUser;
  const activeWorkerId = viewUser?.workerId || null;
  const activeUserId = viewUserId || null;
  
  const weekStartStr = formatDateLocal(weekStart);
  const weekEndStr = weekDays[6].dateStr;
  
  // Get time entries for active user
  const weekTimeEntries = getWeekTimeEntries(weekStartStr, weekEndStr, activeWorkerId, activeUserId);
  
  // Calculate weekly hours: Soll, Geplant, Bestätigt
  const weeklyTarget = viewUser?.weekly_hours_target || 42.5;
  let weekPlanned = 0;
  let weekConfirmed = 0;
  
  // FIX #2: Use centralized helper for consistent calculation
  weekTimeEntries.forEach(entry => {
    const hours = getEntryHours(entry);
    const status = entry.status || 'PLANNED';
    if (status === 'PLANNED' || status === 'CONFIRMED') {
      weekPlanned += hours;
    }
    if (status === 'CONFIRMED') {
      weekConfirmed += hours;
    }
  });
  
  const weekPlannedRounded = Math.round(weekPlanned * 100) / 100;
  const weekConfirmedRounded = Math.round(weekConfirmed * 100) / 100;
  const diffConfirmed = Math.round((weeklyTarget - weekConfirmedRounded) * 100) / 100;
  
  // Calculate px per minute for Outlook-style calendar
  const pxPerMinute = 64 / 60; // ~1.067px per minute
  const slotHeight = 16; // 15 minutes = 16px per slot
  
  // Category colors and labels
  const categoryColors = {
    'BUERO_ALLGEMEIN': '#6a4df7',
    'ENTWICKLUNG': '#3b82f6',
    'MEETING': '#10b981',
    'KRANKHEIT': '#ef4444',
    'TRAINING': '#f59e0b',
    'PAUSE': '#6b7280'
  };
  
  const categoryLabels = {
    'BUERO_ALLGEMEIN': 'Büro',
    'ENTWICKLUNG': 'Entwicklung',
    'MEETING': 'Meeting',
    'KRANKHEIT': 'Krankheit',
    'TRAINING': 'Training',
    'PAUSE': 'Pause'
  };
  
  // Render time entry blocks per day
  const renderTimeEntryBlocks = (dateStr, columnIndex, weekTimeEntries, pxPerMinute, categoryColors, categoryLabels) => {
    const allDayEntries = weekTimeEntries
      .filter(entry => entry.entry_date === dateStr)
      .sort((a, b) => (a.time_from || '00:00').localeCompare(b.time_from || '00:00'));
    
    return allDayEntries.map(entry => {
      const timeFrom = entry.time_from || '00:00';
      const timeTo = entry.time_to || '00:00';
      const [fromHour, fromMin] = timeFrom.split(':').map(Number);
      const [toHour, toMin] = timeTo.split(':').map(Number);
      const fromMinutes = (fromHour || 0) * 60 + (fromMin || 0);
      const toMinutes = (toHour || 0) * 60 + (toMin || 0);
      const durationMinutes = Math.max(0, toMinutes - fromMinutes);
      const top = fromMinutes * pxPerMinute;
      const height = Math.max(durationMinutes * pxPerMinute, 20);
      
      const locationForName = data.locations.find(l => l.id === entry.location_id);
      const locationName = entry.location_code || (locationForName ? (locationForName.code || locationForName.address) : 'Keine Baustelle');
      
      let categoryLabel = categoryLabels[entry.category] || entry.category;
      let categoryColor = categoryColors[entry.category] || '#6b7280';
      
      if (entry.category === 'PROJECT_WORK' || entry.category_display || (entry.category && entry.category.startsWith('PROJECT_'))) {
        const projectCategoryId = entry.category_display || entry.category;
        if (projectCategoryId.startsWith('PROJECT_')) {
          const projectId = projectCategoryId.replace('PROJECT_', '');
          const projectLocation = data.locations.find(l => l.id === projectId);
          if (projectLocation) {
            const projectIndex = data.locations.findIndex(l => l.id === projectId);
            const projectNum = String(projectIndex + 1).padStart(2, '0');
            categoryLabel = `Projekt ${projectNum} – ${projectLocation.code || '—'} ${projectLocation.address || ''}`.trim();
            categoryColor = '#3b82f6';
          }
        }
      }
      
      const blockStyle = `top: ${top}px; height: ${height}px; background: ${categoryColor};`;
      const locationId = entry.location_id ? String(entry.location_id) : null;
      const location = locationId ? (data.locations || []).find(l => 
        String(l.id) === locationId || String(l.location_id) === locationId
      ) : null;
      
      let locationDetails = '';
      if (location) {
        const badges = [];
        if (location.team_leader_name) {
          badges.push(`<span class="location-badge" title="Teamleiter: ${location.team_leader_name}${location.team_leader_phone ? ' (' + location.team_leader_phone + ')' : ''}">👷 ${location.team_leader_name}</span>`);
        }
        if (location.plan_file || location.planFile || (location.documents && location.documents.length > 0)) {
          badges.push('<span class="location-badge" title="Dokumente vorhanden">📄</span>');
        }
        if (location.checklist && (location.checklist.truck_access || location.checklist.safety_briefing || location.checklist.keys_available)) {
          badges.push('<span class="location-badge" title="Checkliste vorhanden">✅</span>');
        }
        if (location.vehicles && Object.values(location.vehicles).some(v => v)) {
          badges.push('<span class="location-badge" title="Fahrzeuge vorhanden">🚚</span>');
        }
        if (location.machines && Object.values(location.machines).some(m => m)) {
          badges.push('<span class="location-badge" title="Maschinen vorhanden">🛠️</span>');
        }
        
        locationDetails = `
          <div class="time-entry-block__location-details">
            <div class="time-entry-block__location-header">
              <span class="location-code">${location.code || '—'}</span>
              <span class="location-title">${location.title || location.address || '—'}</span>
            </div>
            ${location.address ? `<div class="time-entry-block__location-address">${location.address}</div>` : ''}
            ${badges.length > 0 ? `<div class="time-entry-block__location-badges">${badges.join('')}</div>` : ''}
          </div>
        `;
      } else if (!locationId) {
        locationDetails = `
          <div class="time-entry-block__location-details">
            <div class="time-entry-block__location-header">
              <span class="location-title">Intern</span>
            </div>
          </div>
        `;
      } else {
        locationDetails = `
          <div class="time-entry-block__location-details">
            <div class="time-entry-block__location-header">
              <span class="location-title">Baustellendaten nicht geladen</span>
            </div>
          </div>
        `;
      }
      
      let tooltipContent = '';
      if (location) {
        tooltipContent = `
          <div class="location-tooltip" data-location-id="${locationId}" style="display: none;">
            <div class="location-tooltip__header">
              <div class="location-tooltip__code">${location.code || '—'}</div>
              <div class="location-tooltip__title">${location.title || location.address || '—'}</div>
            </div>
            <div class="location-tooltip__body">
              ${location.address ? `<div class="location-tooltip__row"><span class="label">Adresse:</span><span class="value">${location.address}</span></div>` : ''}
              ${location.team_leader_name ? `<div class="location-tooltip__row"><span class="label">Teamleiter:</span><span class="value">${location.team_leader_name}</span></div>` : ''}
              ${location.team_leader_phone ? `<div class="location-tooltip__row"><span class="label">Telefon:</span><span class="value">${location.team_leader_phone}</span></div>` : ''}
              ${(location.plan_file || location.planFile || (location.documents && location.documents.length > 0)) ? `
                <div class="location-tooltip__actions">
                  <button class="btn-tooltip-docs" data-location-id="${locationId}">📄 Dokumente</button>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
      
      const workerId = entry.worker_id ? norm(entry.worker_id) : null;
      
      // Project/Location name (first line)
      const projectName = location ? (location.code || location.address || 'Projekt') : (entry.location_code || 'Intern');
      
      // Time + Status (second line)
      const timeStr = `${entry.time_from}–${entry.time_to}`;
      
      // Status Badge
      const entryStatus = entry.status || 'PLANNED';
      const statusLabel = getStatusLabel(entryStatus);
      const statusBadge = `<span class="status-badge status-badge--${slugifyStatus(entryStatus)}" title="Status: ${statusLabel}">${statusLabel}</span>`;
      
      // Notes/details (third line, truncated)
      const notesStr = entry.notes ? (entry.notes.length > 40 ? entry.notes.substring(0, 40) + '...' : entry.notes) : '';
      
      return `
        <div class="time-grid-entry-block" 
             data-entry-id="${entry.id}"
             data-date-key="${dateStr}"
             data-worker-id="${workerId || ''}"
             data-location-id="${locationId || ''}"
             data-item-kind="actual"
             data-column="${columnIndex}"
             style="${blockStyle}"
             title="${entry.time_from}–${entry.time_to} | ${locationName} | ${categoryLabel} | ${statusLabel}${entry.notes ? ' | ' + entry.notes : ''}">
          <div class="time-entry-block__header">
            <div class="time-entry-block__project">${projectName}</div>
            ${statusBadge}
          </div>
          <div class="time-entry-block__time">${timeStr}</div>
          ${locationDetails}
          <div class="time-entry-block__category">${categoryLabel}</div>
          ${notesStr ? `<div class="time-entry-block__notes" title="${entry.notes}">${notesStr}</div>` : ''}
          ${tooltipContent}
        </div>
      `;
    }).join('');
  };
  
  return `
    <section class="week-time-grid-container">
      <div class="week-time-grid__header">
        <div class="week-time-grid__header-left">
          <div class="week-time-grid__week-info">
            <button class="btn-week-nav" data-week-nav="prev" title="Vorherige Woche (←)">‹</button>
            <button class="btn-week-nav btn-week-nav--today ${isCurrentWeek ? 'btn-week-nav--active' : ''}" data-week-nav="today" title="Aktuelle Woche (Home)">Heute</button>
            <div class="week-label ${isCurrentWeek ? 'week-label--current' : ''}">
              <div class="week-label__title">Wochenübersicht</div>
              <div class="week-label__subtitle">
                ${weekLabel}${isCurrentWeek ? ' <span class="week-label-badge">(Aktuell)</span>' : ''}
              </div>
            </div>
            <button class="btn-week-nav" data-week-nav="next" title="Nächste Woche (→)">›</button>
          </div>
        </div>
        <div class="week-time-grid__header-right">
          <div class="week-hours-summary">
            <div class="hours-summary-item">
              <span class="hours-label">Soll</span>
              <span class="hours-value">${weeklyTarget.toFixed(1)}h</span>
            </div>
            <div class="hours-summary-item">
              <span class="hours-label">Geplant</span>
              <span class="hours-value">${weekPlannedRounded.toFixed(1)}h</span>
            </div>
            <div class="hours-summary-item">
              <span class="hours-label">Bestätigt</span>
              <span class="hours-value">${weekConfirmedRounded.toFixed(1)}h</span>
            </div>
            <div class="hours-summary-item ${diffConfirmed < 0 ? 'hours-summary-item--negative' : diffConfirmed > 0 ? 'hours-summary-item--positive' : ''}">
              <span class="hours-label">Differenz</span>
              <span class="hours-value">${diffConfirmed >= 0 ? '+' : ''}${diffConfirmed.toFixed(1)}h</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="week-time-grid">
        <!-- Sticky Time Axis Column -->
        <div class="week-time-grid__time-axis">
          <div class="time-axis__header"></div>
          <div class="time-axis__slots">
            ${timeSlots.filter(slot => slot.hour >= timeStartHour && slot.hour < timeEndHour).map(slot => `
              <div class="time-axis__slot ${slot.isHour ? 'time-axis__slot--hour' : ''}" style="height: ${slotHeight}px">
                ${slot.isHour ? `<span class="time-axis__label">${slot.display}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Days Columns (Scrollable) -->
        <div class="week-time-grid__days">
          <!-- Sticky Header Row -->
          <div class="week-time-grid__day-headers">
            ${weekDays.map((wd, idx) => `
              <div class="day-header ${wd.isToday ? 'day-header--today' : ''}" data-date="${wd.dateStr}" data-column="${idx}">
                <div class="day-header__name">${wd.dayShort}</div>
                <div class="day-header__date">${wd.dayNum}. ${wd.month}</div>
                ${wd.isToday ? '<div class="day-header__badge">Heute</div>' : ''}
              </div>
            `).join('')}
          </div>
          
          <!-- Time Slots Grid -->
          <div class="week-time-grid__slots-container">
            ${weekDays.map((wd, columnIndex) => `
              <div class="week-time-grid__day-column" data-date="${wd.dateStr}" data-column="${columnIndex}">
                <div class="day-column__slots">
                  ${timeSlots.filter(slot => slot.hour >= timeStartHour && slot.hour < timeEndHour).map(slot => {
                    const slotMinutes = slot.minutes;
                    const dayEntries = weekTimeEntries.filter(entry => {
                      if (entry.entry_date !== wd.dateStr) return false;
                      const [fromHour, fromMin] = (entry.time_from || '00:00').split(':').map(Number);
                      const [toHour, toMin] = (entry.time_to || '00:00').split(':').map(Number);
                      const entryFromMinutes = fromHour * 60 + fromMin;
                      const entryToMinutes = toHour * 60 + toMin;
                      // Slot is covered if entry spans this slot
                      return slotMinutes >= entryFromMinutes && slotMinutes < entryToMinutes;
                    });
                    return `
                      <div class="day-column__slot ${slot.isHour ? 'day-column__slot--hour' : ''} day-column__slot--clickable" 
                           data-time="${slot.display}"
                           data-date="${wd.dateStr}"
                           data-column="${columnIndex}"
                           data-minutes="${slotMinutes}"
                           data-click-slot="true"
                           style="height: ${slotHeight}px"
                           title="Klicken zum Zeiteintrag hinzufügen">
                      </div>
                    `;
                  }).join('')}
                  
                  <!-- Time Entry Blocks Overlay -->
                  <div class="day-column__entries">
                    ${renderTimeEntryBlocks(wd.dateStr, columnIndex, weekTimeEntries, pxPerMinute, categoryColors, categoryLabels)}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
  
  // Setup scroll synchronization after render (called from renderApp)
  // Note: This code runs after the template is returned, so we need to call setupScrollSynchronization
  // from renderApp or bindGlobalEventHandlers after the DOM is updated
}

function renderAvailabilityTimeline() {
  const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
  const workingWorkers = data.workers.filter((w) => w.status === "Arbeitsbereit");

  return `
    <section class="timeline">
      <h3>Verfügbarkeiten der Teams</h3>
      ${days
        .map((day) => {
          const slots = [];
          workingWorkers.forEach((worker) => {
            worker.availability
              .filter((slot) => slot.day === day)
              .forEach((slot) => {
                slots.push({ worker, slot });
              });
          });
          return `
            <div class="timeline__row">
              <strong>${day}</strong>
              ${
                slots.length
                  ? slots
                      .map(
                        ({ worker, slot }) => `
                          <div class="timeline__slot">
                            ${slot.from}–${slot.to} ${worker.name}<br/>
                            <span style="font-size:11px;color:#0f296b;">${slot.job} @ ${slot.site}</span>
                          </div>
                        `
                      )
                      .join("")
                  : '<div class="timeline__slot" style="background:rgba(18,199,125,0.06);color:#3ecf8e;">frei</div>'
              }
            </div>
          `;
        })
        .join("")}
    </section>
  `;
}

// Hinweis: frühere Dashboards (renderTeamsDashboard, renderWorkerDashboard, renderSiteDashboard)
// wurden entfernt, um die UI auf den Kalender-Workflow zu fokussieren.

function renderLocationCard(loc, options = {}) {
  const { showEdit = false } = options;
  const crewContent = loc.crew && loc.crew.length
    ? loc.crew
        .map(
          (member) => `
            <div class="team-list__item">
              <span>${member.name}</span>
              <span>${member.time}</span>
    </div>
          `
        )
        .join("")
    : '<div style="font-size:12px;color:var(--text-muted);">Noch keine Crew zugewiesen</div>';

  return `
    <article class="job-card job-card--site" data-location="${loc.id}">
                  <header class="job-card__header">
                    <div class="job-card__title">${loc.code}</div>
                    <div class="job-card__address">${loc.address}</div>
                    <div class="job-card__badges">
          ${(loc.tags || [])
                        .map(
                          (tag) => `
                            <span class="badge">${tag.icon} ${tag.label}</span>
                          `
                        )
                        .join("")}
  </div>
                  </header>
                  <div class="job-card__body">
        <div class="team-list">${crewContent}</div>
        ${renderLocationSchedule(loc)}
        <div style="font-size:13px;color:var(--text-muted);">${loc.description || "—"}</div>
      </div>
      <footer class="job-card__footer">
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}" target="_blank" rel="noopener">
          📍 Google Maps öffnen
        </a>
      </footer>
      ${
        showEdit
          ? `<div class="card-actions"><button class="link-button" data-edit-location="${loc.id}">Details bearbeiten</button></div>`
          : ""
      }
    </article>
  `;
}

function renderLocationSchedule(loc) {
  if (!loc.schedule) {
    return "";
  }
  const { status, start, end, deadline, progress } = loc.schedule;
  const safeProgress = Math.min(Math.max(parseInt(progress ?? 0, 10), 0), 100);
  return `
    <div class="schedule">
      <div class="schedule__status">
        <span class="status-badge status-${slugifyStatus(status)}">${status || "Unbekannt"}</span>
        <span class="schedule__deadline">Deadline: ${formatDate(deadline)}</span>
      </div>
      <div class="schedule__timeline">
        <span>Start: ${formatDateTime(start)}</span>
        <span>Ende: ${formatDateTime(end)}</span>
      </div>
      <div class="schedule__progress">
        <span style="width:${safeProgress}%;"></span>
      </div>
      <div class="schedule__progress-label">${safeProgress}% abgeschlossen</div>
    </div>
  `;
}

// Event delegation for drag handlers (bound once)
let dragHandlersBound = false;

function attachPersonDragHandlers() {
  if (dragHandlersBound) {
    // Just update draggable attributes on existing elements
    document.querySelectorAll(".person-card").forEach((el) => {
      const workerId = el.getAttribute("data-worker-id");
      if (!workerId) {
        const nameEl = el.querySelector(".person-card__info span:first-child");
        const name = nameEl ? nameEl.textContent : "";
        const worker = data.workers.find((w) => w.name === name);
        if (worker && worker.status === "Arbeitsbereit") {
          el.setAttribute("draggable", "true");
        }
      } else {
        const worker = data.workers.find((w) => w.id === workerId);
        if (worker && worker.status === "Arbeitsbereit") {
          el.setAttribute("draggable", "true");
        }
      }
    });
    document.querySelectorAll(".team-card").forEach((el) => {
      const teamId = el.getAttribute("data-team-id");
      if (teamId) {
        const team = data.teams.find((t) => t.id === teamId);
        if (team && team.isActive && team.members && team.members.length > 0) {
          el.setAttribute("draggable", "true");
        }
      }
    });
    return;
  }
  
  dragHandlersBound = true;
  
  // Event delegation for person card drag
  document.addEventListener("dragstart", (e) => {
    const personCard = e.target.closest(".person-card");
    if (personCard) {
      let workerId = personCard.getAttribute("data-worker-id");
      let worker = null;
      
      if (!workerId) {
        // Fallback: find by name
        const nameEl = personCard.querySelector(".person-card__info span:first-child");
        const name = nameEl ? nameEl.textContent : "";
        worker = data.workers.find((w) => w.name === name);
      } else {
        worker = data.workers.find((w) => w.id === workerId);
      }
      
      if (worker && worker.status === "Arbeitsbereit") {
        uiState.draggedWorkerId = worker.id;
        uiState.draggedTeamId = null;
        uiState.draggedFromLocationId = null;
        uiState.draggedFromDay = null;
        personCard.classList.add("dragging");
      }
    }
    
    const teamCard = e.target.closest(".team-card");
    if (teamCard) {
      const teamId = teamCard.getAttribute("data-team-id");
      if (teamId) {
        const team = data.teams.find((t) => t.id === teamId);
        if (team && team.isActive && team.members && team.members.length > 0) {
          uiState.draggedTeamId = team.id;
          uiState.draggedWorkerId = null;
          uiState.draggedFromLocationId = null;
          uiState.draggedFromDay = null;
          teamCard.classList.add("dragging");
        }
      }
    }
  });
  
  document.addEventListener("dragend", (e) => {
    const personCard = e.target.closest(".person-card");
    if (personCard) {
      uiState.draggedWorkerId = null;
      uiState.draggedTeamId = null;
      uiState.draggedFromLocationId = null;
      uiState.draggedFromDay = null;
      personCard.classList.remove("dragging");
    }
    
    const teamCard = e.target.closest(".team-card");
    if (teamCard) {
      uiState.draggedTeamId = null;
      uiState.draggedWorkerId = null;
      uiState.draggedFromLocationId = null;
      uiState.draggedFromDay = null;
      teamCard.classList.remove("dragging");
    }
  });
  
  // Set draggable attributes
  document.querySelectorAll(".person-card").forEach((el) => {
    const workerId = el.getAttribute("data-worker-id");
    if (!workerId) {
      const nameEl = el.querySelector(".person-card__info span:first-child");
      const name = nameEl ? nameEl.textContent : "";
      const worker = data.workers.find((w) => w.name === name);
      if (worker && worker.status === "Arbeitsbereit") {
        el.setAttribute("draggable", "true");
      }
    } else {
      const worker = data.workers.find((w) => w.id === workerId);
      if (worker && worker.status === "Arbeitsbereit") {
        el.setAttribute("draggable", "true");
      }
    }
  });
  
  document.querySelectorAll(".team-card").forEach((el) => {
    const teamId = el.getAttribute("data-team-id");
    if (teamId) {
      const team = data.teams.find((t) => t.id === teamId);
      if (team && team.isActive && team.members && team.members.length > 0) {
        el.setAttribute("draggable", "true");
      }
    }
  });
}

// Event delegation for worker pill handlers (bound once)
let workerPillHandlersBound = false;

function attachWorkerPillHandlers() {
  if (workerPillHandlersBound) return;
  workerPillHandlersBound = true;
  
  // Remove button handlers via event delegation
  document.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".worker-pill__remove");
    if (removeBtn) {
      e.stopPropagation();
      const workerId = removeBtn.getAttribute("data-remove-worker");
      const locationId = removeBtn.getAttribute("data-remove-location");
      const day = removeBtn.getAttribute("data-remove-day");
      
      if (workerId && locationId && day) {
        removeWorkerFromLocationDay(locationId, workerId, day);
      }
    }
  });
  
  // Drag handlers for worker pills via event delegation
  document.addEventListener("dragstart", (e) => {
    const pill = e.target.closest(".cell-worker-pill");
    if (pill) {
      const workerId = pill.getAttribute("data-worker-id");
      const locationId = pill.getAttribute("data-location-id");
      const day = pill.getAttribute("data-day");
      
      if (workerId && locationId && day) {
        uiState.draggedWorkerId = workerId;
        uiState.draggedFromLocationId = locationId;
        uiState.draggedFromDay = day;
        pill.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      }
    }
  });
  
  document.addEventListener("dragend", (e) => {
    const pill = e.target.closest(".cell-worker-pill");
    if (pill) {
      pill.classList.remove("dragging");
      // Reset will happen after drop
    }
  });
  
  // Prevent drag on remove button via event delegation
  document.addEventListener("mousedown", (e) => {
    if (e.target.closest(".worker-pill__remove")) {
      e.stopPropagation();
    }
  });
}

async function assignWorkerToLocation(locationId, workerId, assignAllWeek = false) {
  const loc = data.locations.find((l) => l.id === locationId);
  const worker = data.workers.find((w) => w.id === workerId);
  if (!loc || !worker) return;
  
  const defaultFrom = "07:00";
  const defaultTo = "16:00";
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  
  try {
    const daysToAssign = assignAllWeek ? dayNames.slice(1, 6) : ['Montag']; // Monday-Friday or just Monday
    const today = new Date();
    const assignmentsToSave = [];
    
    daysToAssign.forEach((day) => {
      const dayIndex = dayNames.indexOf(day);
      if (dayIndex === -1) return;
      
      const daysUntilDay = (dayIndex - today.getDay() + 7) % 7 || 7;
      const assignmentDate = new Date(today);
      assignmentDate.setDate(today.getDate() + daysUntilDay);
      const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
      
      assignmentsToSave.push({
        location_id: locationId,
        worker_id: workerId,
        assignment_date: assignmentDateStr,
        time_from: defaultFrom,
        time_to: defaultTo
      });
    });
    
    // Save all assignments to database
    const savePromises = assignmentsToSave.map(assignment => saveAssignmentToAPI(assignment));
    await Promise.all(savePromises);
    
    // Reload all data from API to ensure everything is in sync
    await loadAllData();
    // Re-render the app to show updated data
    renderApp();
  } catch (error) {
    console.error('Error assigning worker to location:', error);
  }
}

async function removeWorkerFromLocationDay(locationId, workerId, day) {
  const loc = data.locations.find((l) => l.id === locationId);
  const worker = data.workers.find((w) => w.id === workerId);
  if (!loc || !worker) return;
  
  // Convert day name to date
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayIndex = dayNames.indexOf(day);
  if (dayIndex === -1) return;
  
  const today = new Date();
  const daysUntilDay = (dayIndex - today.getDay() + 7) % 7 || 7;
  const assignmentDate = new Date(today);
  assignmentDate.setDate(today.getDate() + daysUntilDay);
  const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
  
  try {
    // Find the assignment ID first
    const assignmentsResponse = await api.getAssignments({
      location_id: locationId,
      worker_id: workerId,
      date: assignmentDateStr
    });
    
    if (assignmentsResponse.success && assignmentsResponse.data && assignmentsResponse.data.length > 0) {
      // Delete all matching assignments
      const deletePromises = assignmentsResponse.data.map(assignment => 
        api.deleteAssignment(assignment.id)
      );
      await Promise.all(deletePromises);
    } else {
      // Fallback: try to delete by location, date, and worker using POST with DELETE body
      try {
        await api.post('assignments', {
          _method: 'DELETE',
          location_id: locationId,
          worker_id: workerId,
          assignment_date: assignmentDateStr
        });
      } catch (error) {
        console.error('Error deleting assignment:', error);
      }
    }
    
    // Reload all data from API to ensure everything is in sync
    await loadAllData();
    // Re-render the app to show updated data
    renderApp();
  } catch (error) {
    console.error('Error removing worker assignment:', error);
    // Reload data from API even on error to ensure consistency
    try {
      await loadAllData();
      renderApp();
    } catch (reloadError) {
      console.error('Error reloading data:', reloadError);
    }
  }
}

async function removeWorkerFromMultipleDays(locationId, workerId, days) {
  const loc = data.locations.find((l) => l.id === locationId);
  const worker = data.workers.find((w) => w.id === workerId);
  if (!loc || !worker) return;
  
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const today = new Date();
  
  try {
    // Convert day names to dates and delete assignments
    const deletePromises = days.map(async (day) => {
      const dayIndex = dayNames.indexOf(day);
      if (dayIndex === -1) return;
      
      const daysUntilDay = (dayIndex - today.getDay() + 7) % 7 || 7;
      const assignmentDate = new Date(today);
      assignmentDate.setDate(today.getDate() + daysUntilDay);
      const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
      
      // Find and delete assignments
      const assignmentsResponse = await api.getAssignments({
        location_id: locationId,
        worker_id: workerId,
        date: assignmentDateStr
      });
      
      if (assignmentsResponse.success && assignmentsResponse.data && assignmentsResponse.data.length > 0) {
        const deletePromises = assignmentsResponse.data.map(assignment => 
          api.deleteAssignment(assignment.id)
        );
        await Promise.all(deletePromises);
      }
    });
    
    await Promise.all(deletePromises);
    
    // Reload all data from API to ensure everything is in sync
    await loadAllData();
    // Re-render the app to show updated data
    renderApp();
  } catch (error) {
    console.error('Error removing worker from multiple days:', error);
  }
}

async function assignWorkerToLocationDay(locationId, workerId, day) {
  const loc = data.locations.find((l) => l.id === locationId);
  const worker = data.workers.find((w) => w.id === workerId);
  if (!loc || !worker) return;
  
  const defaultFrom = "07:00";
  const defaultTo = "16:00";
  // Schedule wird aus der Datenbank geladen, nicht lokal gesetzt
  
  // Convert day name to date (find next occurrence of this day)
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayIndex = dayNames.indexOf(day);
  if (dayIndex === -1) return;
  
  const today = new Date();
  const daysUntilDay = (dayIndex - today.getDay() + 7) % 7 || 7;
  const assignmentDate = new Date(today);
  assignmentDate.setDate(today.getDate() + daysUntilDay);
  const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
  
  try {
    // Save assignment via API
    const result = await saveAssignmentToAPI({
      location_id: locationId,
      worker_id: workerId,
      assignment_date: assignmentDateStr,
      time_from: defaultFrom,
      time_to: defaultTo
    });
    
    if (result.success) {
      // Reload all data from API to ensure everything is in sync
      await loadAllData();
      // Re-render the app to show updated data
      renderApp();
    } else {
      console.error('Failed to save assignment:', result.error);
    }
  } catch (error) {
    console.error('Error assigning worker:', error);
  }
}

async function assignWorkerToMultipleDays(workerId, cells) {
  if (!cells || cells.length === 0) return;
  
  const worker = data.workers.find((w) => w.id === workerId);
  if (!worker) return;
  
  const defaultFrom = "07:00";
  const defaultTo = "16:00";
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  
  // Group cells by location and day
  const assignmentsToSave = [];
  
  cells.forEach((cell) => {
    const locationId = cell.getAttribute("data-location-id");
    const day = cell.getAttribute("data-day");
    
    if (!locationId || !day) return;
    
    const loc = data.locations.find((l) => l.id === locationId);
    if (!loc) return;
    
    // Convert day name to date
    const dayIndex = dayNames.indexOf(day);
    if (dayIndex === -1) return;
    
    const today = new Date();
    const daysUntilDay = (dayIndex - today.getDay() + 7) % 7 || 7;
    const assignmentDate = new Date(today);
    assignmentDate.setDate(today.getDate() + daysUntilDay);
    const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
    
    assignmentsToSave.push({
      location_id: locationId,
      worker_id: workerId,
      assignment_date: assignmentDateStr,
      time_from: defaultFrom,
      time_to: defaultTo
    });
  });
  
  // Save all assignments to database
  try {
    const savePromises = assignmentsToSave.map(assignment => saveAssignmentToAPI(assignment));
    await Promise.all(savePromises);
    
    // Reload all data from API to ensure everything is in sync
    await loadAllData();
    // Re-render the app to show updated data
    renderApp();
  } catch (error) {
    console.error('Error assigning worker to multiple days:', error);
  }
}

// Team assignment functions - assign all team members automatically
async function assignTeamToLocationDay(locationId, teamId, day) {
  const loc = data.locations.find((l) => l.id === locationId);
  const team = data.teams.find((t) => t.id === teamId);
  if (!loc || !team || !team.members || team.members.length === 0) return;
  
  const defaultFrom = "07:00";
  const defaultTo = "16:00";
  // Schedule wird aus der Datenbank geladen, nicht lokal gesetzt
  
  // Convert day name to date
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayIndex = dayNames.indexOf(day);
  if (dayIndex === -1) return;
  
  const today = new Date();
  const daysUntilDay = (dayIndex - today.getDay() + 7) % 7 || 7;
  const assignmentDate = new Date(today);
  assignmentDate.setDate(today.getDate() + daysUntilDay);
  const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
  
  try {
    // Save team assignment via API (creates assignments for all team members)
    const result = await saveAssignmentToAPI({
      location_id: locationId,
      team_id: teamId,
      assignment_date: assignmentDateStr,
      time_from: defaultFrom,
      time_to: defaultTo
    });
    
    if (result.success) {
      // Reload all data from API to ensure everything is in sync
      await loadAllData();
      // Re-render the app to show updated data
      renderApp();
    } else {
      console.error('Failed to save team assignment:', result.error);
    }
  } catch (error) {
    console.error('Error assigning team:', error);
  }
}

async function assignTeamToMultipleDays(teamId, cells) {
  if (!cells || cells.length === 0) return;
  
  const team = data.teams.find((t) => t.id === teamId);
  if (!team || !team.members || team.members.length === 0) return;
  
  const defaultFrom = "07:00";
  const defaultTo = "16:00";
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  
  // Group cells by location and day
  const assignmentsToSave = [];
  
  cells.forEach((cell) => {
    const locationId = cell.getAttribute("data-location-id");
    const day = cell.getAttribute("data-day");
    
    if (!locationId || !day) return;
    
    const loc = data.locations.find((l) => l.id === locationId);
    if (!loc) return;
    
    // Convert day name to date
    const dayIndex = dayNames.indexOf(day);
    if (dayIndex === -1) return;
    
    const today = new Date();
    const daysUntilDay = (dayIndex - today.getDay() + 7) % 7 || 7;
    const assignmentDate = new Date(today);
    assignmentDate.setDate(today.getDate() + daysUntilDay);
    const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
    
    // Save team assignment (backend will create assignments for all team members)
    assignmentsToSave.push({
      location_id: locationId,
      team_id: teamId,
      assignment_date: assignmentDateStr,
      time_from: defaultFrom,
      time_to: defaultTo
    });
  });
  
  // Save all assignments to database
  try {
    const savePromises = assignmentsToSave.map(assignment => saveAssignmentToAPI(assignment));
    await Promise.all(savePromises);
    
    // Reload all data from API to ensure everything is in sync
    await loadAllData();
    // Re-render the app to show updated data
    renderApp();
  } catch (error) {
    console.error('Error assigning team to multiple days:', error);
  }
}

async function assignWorkerToLocationMultiDay(locationId, workerId, startDayIndex, endDayIndex) {
  const loc = data.locations.find((l) => l.id === locationId);
  const worker = data.workers.find((w) => w.id === workerId);
  if (!loc || !worker) return;
  
  const defaultFrom = "07:00";
  const defaultTo = "16:00";
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const today = new Date();
  
  try {
    const assignmentsToSave = [];
    
    // Convert day indices to day names and dates
    for (let i = startDayIndex; i <= endDayIndex && i < dayNames.length; i++) {
      const day = dayNames[i];
      const dayIndex = i;
      
      const daysUntilDay = (dayIndex - today.getDay() + 7) % 7 || 7;
      const assignmentDate = new Date(today);
      assignmentDate.setDate(today.getDate() + daysUntilDay);
      const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
      
      assignmentsToSave.push({
        location_id: locationId,
        worker_id: workerId,
        assignment_date: assignmentDateStr,
        time_from: defaultFrom,
        time_to: defaultTo
      });
    }
    
    // Save all assignments to database
    const savePromises = assignmentsToSave.map(assignment => saveAssignmentToAPI(assignment));
    await Promise.all(savePromises);
    
    // Reload all data from API to ensure everything is in sync
    await loadAllData();
    // Re-render the app to show updated data
    renderApp();
  } catch (error) {
    console.error('Error assigning worker to location multi-day:', error);
  }
}

async function assignWorkerToCalendarDay(targetWorkerId, draggedWorkerId, day) {
  // Diese Funktion wird nicht mehr verwendet - alle Zuweisungen gehen über Locations
  // Falls noch verwendet, sollte sie durch assignWorkerToLocationDay ersetzt werden
  console.warn('assignWorkerToCalendarDay is deprecated - use assignWorkerToLocationDay instead');
}

async function assignWorkerToCalendarDayWithLocation(targetWorkerId, draggedWorkerId, day, location) {
  // Diese Funktion sollte assignWorkerToLocationDay verwenden
  // Alle Zuweisungen müssen über die API gehen
  if (!location || !draggedWorkerId) return;
  
  // Verwende die existierende API-Funktion
  await assignWorkerToLocationDay(location.id, draggedWorkerId, day);
}

function highlightCalendarWeekRange() {
  if (!uiState.dragStartCell || !uiState.dragEndCell) return;
  
  const startDay = uiState.dragStartCell.getAttribute("data-day");
  const endDay = uiState.dragEndCell.getAttribute("data-day");
  const startWorkerId = uiState.dragStartCell.getAttribute("data-worker-id");
  const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
  const startIdx = days.indexOf(startDay);
  const endIdx = days.indexOf(endDay);
  
  // Clear all highlights first
  document.querySelectorAll(".calendar-week-view__cell--drop").forEach((c) => {
    c.classList.remove("drop-range");
  });
  
  // Highlight range
  document.querySelectorAll(".calendar-week-view__cell--drop").forEach((cell) => {
    const cellDay = cell.getAttribute("data-day");
    const cellIdx = days.indexOf(cellDay);
    const sameRow = cell.getAttribute("data-worker-id") === startWorkerId;
    
    if (sameRow) {
      if ((startIdx <= endIdx && cellIdx >= startIdx && cellIdx <= endIdx) ||
          (startIdx > endIdx && cellIdx <= startIdx && cellIdx >= endIdx)) {
        cell.classList.add("drop-range");
      }
    }
  });
}

// Event delegation for worker status handlers (bound once)
let workerStatusHandlersBound = false;

function attachWorkerStatusHandlers() {
  if (workerStatusHandlersBound) return;
  workerStatusHandlersBound = true;
  
  // Worker status change via event delegation
  document.addEventListener("change", async (event) => {
    const select = event.target.closest(".worker-status");
    if (!select) return;
    
    const workerId = select.getAttribute("data-worker");
    const worker = data.workers.find((w) => w.id === workerId);
    if (!worker) return;
    
    // Update worker status via API
    try {
      const updatedWorker = { ...worker, status: event.target.value };
      const result = await saveWorkerToAPI(updatedWorker);
      if (result.success) {
        // Reload all data from API
        await loadAllData();
        renderApp();
      }
    } catch (error) {
      console.error('Error updating worker status:', error);
      // Revert on error
      select.value = worker.status;
    }
  });
}

function openAddWorkerModal() {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay" data-close>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="addWorkerTitle" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title" id="addWorkerTitle">Personal hinzufügen</div>
          <button class="btn btn--ghost" id="btn-close-modal">✕</button>
        </div>
        <form id="form-add-worker">
          <div class="modal__body">
            <div class="field">
              <label for="firstName">Vorname</label>
              <input id="firstName" class="input" required />
            </div>
            <div class="field">
              <label for="lastName">Nachname</label>
              <input id="lastName" class="input" required />
            </div>
            <div class="field">
              <label for="function">Funktion</label>
              <input id="function" class="input" placeholder="z.B. Monteur" required />
            </div>
            <div class="field">
              <label for="company">Firma</label>
              <input id="company" class="input" placeholder="z.B. AFT Bau" required />
            </div>
            <div class="field">
              <label for="contactPhone">Telefon</label>
              <input id="contactPhone" class="input" placeholder="+41 ..." required />
            </div>
            <div class="field">
              <label for="contactEmail">E-Mail</label>
              <input id="contactEmail" type="email" class="input" placeholder="name@example.ch" required />
            </div>
            <div class="field">
              <label for="username">Benutzername</label>
              <input id="username" class="input" placeholder="z.B. ivan.majanovic" required />
              <small style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block;">
                Format: vorname.nachname (wird automatisch generiert, falls leer)
              </small>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel">Abbrechen</button>
            <button type="submit" class="btn btn--primary">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = root.querySelector(".modal-overlay");
  const close = () => (root.innerHTML = "");
  overlay.addEventListener("click", close);
  root.querySelector("#btn-close-modal").addEventListener("click", close);
  root.querySelector("#btn-cancel").addEventListener("click", close);
  
  // Auto-generate username when first/last name changes
  const firstNameInput = root.querySelector("#firstName");
  const lastNameInput = root.querySelector("#lastName");
  const usernameInput = root.querySelector("#username");
  
  const updateUsername = () => {
    const first = firstNameInput.value.trim().toLowerCase();
    const last = lastNameInput.value.trim().toLowerCase();
    if (first && last && !usernameInput.value.trim()) {
      usernameInput.value = `${first}.${last}`;
    }
  };
  
  firstNameInput.addEventListener("input", updateUsername);
  lastNameInput.addEventListener("input", updateUsername);
  
  root.querySelector("#form-add-worker").addEventListener("submit", async (e) => {
    e.preventDefault();
    const first = root.querySelector("#firstName").value.trim();
    const last = root.querySelector("#lastName").value.trim();
    const func = root.querySelector("#function").value.trim();
    const comp = root.querySelector("#company").value.trim();
    const phone = root.querySelector("#contactPhone").value.trim();
    const email = root.querySelector("#contactEmail").value.trim();
    let username = root.querySelector("#username").value.trim().toLowerCase();
    
    if (!first || !last || !func || !comp) return;
    
    // Generate username if not provided
    if (!username) {
      username = generateUsername(`${first} ${last}`);
    }
    
    // Check if username already exists
    if (data.users.some(u => u.username === username)) {
      alert(`Der Benutzername "${username}" ist bereits vergeben. Bitte wählen Sie einen anderen.`);
      return;
    }
    
    const workerId = `worker-${Date.now()}`;
    const fullName = `${first} ${last}`;
    
    // Disable submit button while saving
    const submitBtn = root.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Speichere...";
    
    try {
      // Create worker via API
      const workerData = {
        id: workerId,
        name: fullName,
        role: func,
        company: comp,
        status: "Arbeitsbereit",
        contact: { phone, email },
        availability: [],
      };
      
      const workerResult = await saveWorkerToAPI(workerData);
      if (!workerResult.success) {
        throw new Error(workerResult.error || 'Fehler beim Speichern des Mitarbeiters');
      }
      
      // Create user account for worker via API
      const userData = {
        id: `user-${workerId}`,
        username: username,
        name: fullName,
        email: email,
        password: "010203",
        role: "Worker",
        permissions: ["Lesen", "view_own"],
        worker_id: workerId,
        first_login: true,
        lastLogin: null,
      };
      
      const userResult = await saveUserToAPI(userData);
      if (!userResult.success) {
        throw new Error(userResult.error || 'Fehler beim Erstellen des Benutzers');
      }
      
      close();
      await loadAllData(); // Reload all data from API
      renderApp();
    } catch (error) {
      console.error('Error creating worker/user:', error);
      alert(`Fehler: ${error.message || 'Fehler beim Speichern. Bitte versuchen Sie es erneut.'}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

function openAddLocationModal() {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay" data-close>
      <div class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="addLocTitle" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title" id="addLocTitle">Einsatzort hinzufügen</div>
          <button class="btn btn--ghost" id="btn-close-loc">✕</button>
        </div>
        <form id="form-add-location">
          <div class="modal__body modal__body--wide">
            <div class="modal-section">
              <div class="modal-section__title">📍 Baustellen-Informationen</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="siteNumber">Baustellen-Nr</label>
                    <input id="siteNumber" class="input" placeholder="z.B. 25-003" required />
                  </div>
                  <div class="field field--half">
                    <label for="siteTitle">Titel</label>
                    <input id="siteTitle" class="input" placeholder="z.B. Zürich, Musterstrasse 5" required />
                  </div>
                </div>
                <div class="field-row">
                  <div class="field field--two-thirds">
                    <label for="address">Adresse (Ziel)</label>
                    <input id="address" class="input" placeholder="Strasse Nr, PLZ Ort" required />
                  </div>
                  <div class="field field--one-third">
                    <label for="origin">Start (optional, für Route)</label>
                    <input id="origin" class="input" placeholder="Startadresse oder Standort" />
                  </div>
                </div>
                <div class="field">
                  <label for="desc">Beschreibung</label>
                  <textarea id="desc" class="input input--textarea" placeholder="Kurzbeschreibung der Arbeiten" rows="3"></textarea>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">👤 Teamleiter</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="leadName">Name</label>
                    <input id="leadName" class="input" placeholder="Name Teamleiter" required />
                  </div>
                  <div class="field field--half">
                    <label for="leadPhone">Telefon</label>
                    <input id="leadPhone" class="input" placeholder="+41 ..." required />
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">✅ Checkliste</div>
              <div class="modal-section__content">
                <div class="checklist checklist--grid">
                  <div class="checkbox">
                    <input id="chk-access" type="checkbox" />
                    <label for="chk-access">Zufahrt für LKW möglich</label>
                  </div>
                  <div class="checkbox">
                    <input id="chk-briefing" type="checkbox" />
                    <label for="chk-briefing">Sicherheitsbriefing notwendig</label>
                  </div>
                  <div class="checkbox">
                    <input id="chk-permit" type="checkbox" />
                    <label for="chk-permit">Genehmigungen / Schlüssel vorhanden</label>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">🚚 Fahrzeuge & Maschinen</div>
              <div class="modal-section__content">
                <div class="equipment-checklist equipment-checklist--wide">
                  <div class="equipment-section">
                    <div class="equipment-section-title">🚚 Fahrzeuge</div>
                    <div class="equipment-checkboxes equipment-checkboxes--grid">
                      <div class="checkbox">
                        <input id="veh-lkw" type="checkbox" value="LKW benötigt" />
                        <label for="veh-lkw">LKW</label>
                      </div>
                      <div class="checkbox">
                        <input id="veh-transporter" type="checkbox" value="Transporter benötigt" />
                        <label for="veh-transporter">Transporter</label>
                      </div>
                      <div class="checkbox">
                        <input id="veh-kran" type="checkbox" value="Kran benötigt" />
                        <label for="veh-kran">Kran / Hubwagen</label>
                      </div>
                      <div class="checkbox">
                        <input id="veh-bagger" type="checkbox" value="Bagger benötigt" />
                        <label for="veh-bagger">Bagger</label>
                      </div>
                      <div class="checkbox">
                        <input id="veh-stapler" type="checkbox" value="Stapler benötigt" />
                        <label for="veh-stapler">Stapler</label>
                      </div>
                    </div>
                  </div>
                  <div class="equipment-section">
                    <div class="equipment-section-title">🔧 Maschinen & Werkzeuge</div>
                    <div class="equipment-checkboxes equipment-checkboxes--grid">
                      <div class="checkbox">
                        <input id="mach-schweiss" type="checkbox" value="Schweißen" />
                        <label for="mach-schweiss">Schweißgerät</label>
                      </div>
                      <div class="checkbox">
                        <input id="mach-kompressor" type="checkbox" value="Kompressor benötigt" />
                        <label for="mach-kompressor">Kompressor</label>
                      </div>
                      <div class="checkbox">
                        <input id="mach-bohrmaschine" type="checkbox" value="Bohrmaschine benötigt" />
                        <label for="mach-bohrmaschine">Bohrmaschine</label>
                      </div>
                      <div class="checkbox">
                        <input id="mach-schleifmaschine" type="checkbox" value="Schleifmaschine benötigt" />
                        <label for="mach-schleifmaschine">Schleifmaschine</label>
                      </div>
                      <div class="checkbox">
                        <input id="mach-geruest" type="checkbox" value="Gerüst benötigt" />
                        <label for="mach-geruest">Gerüst</label>
                      </div>
                      <div class="checkbox">
                        <input id="mach-heber" type="checkbox" value="Hebezeug benötigt" />
                        <label for="mach-heber">Hebezeug / Flaschenzug</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">🗺️ Route</div>
              <div class="modal-section__content">
                <div class="field">
                  <label>Karten-/Routenlink</label>
                  <a id="mapsLink" class="badge badge--link" href="#" target="_blank" rel="noopener">📍 Google Maps öffnen</a>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📄 Pläne & Dokumente</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="planUpload">Baustellen-Plan hochladen</label>
                  <div class="file-upload-container">
                    <input type="file" id="planUpload" class="file-input" accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp" />
                    <label for="planUpload" class="file-upload-label">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <span>Datei auswählen</span>
                    </label>
                    <div id="planFileName" class="file-name-display" style="display: none;">
                      <span class="file-name-text"></span>
                      <button type="button" class="file-remove-btn" id="removePlanFile">✕</button>
                    </div>
                  </div>
                  <small style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block;">
                    Unterstützte Formate: PDF, PNG, JPG, JPEG, GIF, BMP
                  </small>
                </div>
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-loc">Abbrechen</button>
            <button type="submit" class="btn btn--primary">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = root.querySelector(".modal-overlay");
  const close = () => (root.innerHTML = "");
  overlay.addEventListener("click", close);
  root.querySelector("#btn-close-loc").addEventListener("click", close);
  root.querySelector("#btn-cancel-loc").addEventListener("click", close);

  // Update Google Maps link when address/origin changes
  const addressEl = root.querySelector("#address");
  const originEl = root.querySelector("#origin");
  const linkEl = root.querySelector("#mapsLink");
  const updateLink = () => {
    const dest = encodeURIComponent(addressEl.value.trim());
    const origin = encodeURIComponent(originEl.value.trim());
    let href = "https://www.google.com/maps/dir/?api=1";
    if (dest) href += `&destination=${dest}`;
    if (origin) href += `&origin=${origin}`;
    linkEl.setAttribute("href", href);
  };
  addressEl.addEventListener("input", updateLink);
  originEl.addEventListener("input", updateLink);
  updateLink();

  // File upload handler
  let uploadedPlanFile = null;
  let uploadedPlanFileName = null;
  const planUploadInput = root.querySelector("#planUpload");
  const planFileNameDisplay = root.querySelector("#planFileName");
  const planFileNameText = planFileNameDisplay.querySelector(".file-name-text");
  const removePlanBtn = root.querySelector("#removePlanFile");

  planUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("Die Datei ist zu groß. Bitte wählen Sie eine Datei unter 10 MB.");
        planUploadInput.value = "";
        return;
      }

      uploadedPlanFileName = file.name;
      planFileNameText.textContent = file.name;
      planFileNameDisplay.style.display = "flex";

      // Read file as Base64
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedPlanFile = event.target.result; // Base64 string
      };
      reader.readAsDataURL(file);
    }
  });

  removePlanBtn.addEventListener("click", () => {
    uploadedPlanFile = null;
    uploadedPlanFileName = null;
    planUploadInput.value = "";
    planFileNameDisplay.style.display = "none";
  });

  root.querySelector("#form-add-location").addEventListener("submit", async (e) => {
    e.preventDefault();
    const siteNumber = root.querySelector("#siteNumber").value.trim();
    const siteTitle = root.querySelector("#siteTitle").value.trim();
    const code = `${siteNumber} ${siteTitle}`;
    const address = addressEl.value.trim();
    const description = root.querySelector("#desc").value.trim() || "—";
    const leadName = root.querySelector("#leadName").value.trim();
    const leadPhone = root.querySelector("#leadPhone").value.trim();

    if (!code || !address || !leadName || !leadPhone) return;

    // Collect tags from checkboxes
    const tags = [{ icon: "📍", label: "Einsatzort" }];
    
    // Add general checklist items
    if (root.querySelector("#chk-access").checked) {
      tags.push({ icon: "🚚", label: "LKW benötigt" });
    }
    if (root.querySelector("#chk-briefing").checked) {
      tags.push({ icon: "⚠️", label: "Sicherheitsbriefing" });
    }
    if (root.querySelector("#chk-permit").checked) {
      tags.push({ icon: "🔑", label: "Genehmigungen / Schlüssel vorhanden" });
    }

    // Add equipment tags (vehicles and machines)
    const equipmentIcons = {
      "LKW benötigt": "🚚",
      "Transporter benötigt": "🚐",
      "Kran benötigt": "🏗️",
      "Bagger benötigt": "🚜",
      "Stapler benötigt": "🚛",
      "Schweißen": "🔧",
      "Kompressor benötigt": "💨",
      "Bohrmaschine benötigt": "🔩",
      "Schleifmaschine benötigt": "⚙️",
      "Gerüst benötigt": "🪜",
      "Hebezeug benötigt": "⚖️"
    };

    // Get all checked equipment checkboxes (avoid duplicates with checklist items)
    const checkedEquipment = Array.from(root.querySelectorAll(".equipment-checklist input[type='checkbox']:checked"))
      .map((checkbox) => checkbox.value)
      .filter((value) => {
        // Don't add if already in tags (e.g., "LKW benötigt" from chk-access)
        return !tags.some((tag) => tag.label === value);
      });

    checkedEquipment.forEach((label) => {
      const icon = equipmentIcons[label] || "🔧";
      tags.push({ icon, label });
    });

    // Disable submit button while saving
    const submitBtn = root.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Speichere...";

    try {
      const locationData = {
        id: `loc-${Date.now()}`,
        code,
        address,
        description: `${description} — Leiter: ${leadName} (${leadPhone})`,
        crew: [],
        tags: tags,
      schedule: {
        status: "Geplant",
        start: "",
        end: "",
        deadline: "",
        progress: 0,
      },
      planFile: uploadedPlanFile || null,
      planFileName: uploadedPlanFileName || null,
      };

      const result = await saveLocationToAPI(locationData);
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern der Baustelle');
      }

      close();
      await loadAllData(); // Reload all data from API
      renderApp();
    } catch (error) {
      console.error('Error creating location:', error);
      alert(`Fehler: ${error.message || 'Fehler beim Speichern. Bitte versuchen Sie es erneut.'}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

function openEditUserModal(userId) {
  const user = data.users.find((u) => u.id === userId);
  if (!user) return;
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay" data-close>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="editUserTitle" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title" id="editUserTitle">Benutzer bearbeiten</div>
          <button class="btn btn--ghost" id="btn-close-user">✕</button>
        </div>
        <form id="form-edit-user">
          <div class="modal__body">
            <div class="field">
              <label for="editUserName">Name</label>
              <input id="editUserName" class="input" value="${user.name}" required />
            </div>
            <div class="field">
              <label for="editUserEmail">E-Mail</label>
              <input id="editUserEmail" type="email" class="input" value="${user.email}" required />
            </div>
            <div class="field">
              <label for="editUserRole">Rolle</label>
              <select id="editUserRole" class="select">
                ${Object.keys(ROLE_PRESETS)
                        .map(
                    (role) => `
                      <option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>
                          `
                        )
                        .join("")}
              </select>
            </div>
            <div class="field">
              <label>Berechtigungen</label>
              <div class="permission-chips">
                ${ALL_PERMISSIONS.map((perm) => {
                  const checked = user.permissions.includes(perm);
                  return `
                    <label class="permission-chip">
                      <input type="checkbox" value="${perm}" ${checked ? "checked" : ""}/>
                      <span>${perm}</span>
                    </label>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-user">Abbrechen</button>
            <button type="submit" class="btn btn--primary">Speichern</button>
          </div>
        </form>
                    </div>
                  </div>
  `;

  const close = () => (root.innerHTML = "");
  root.querySelector(".modal-overlay").addEventListener("click", close);
  root.querySelector("#btn-close-user").addEventListener("click", close);
  root.querySelector("#btn-cancel-user").addEventListener("click", close);
  root.querySelector("#form-edit-user").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = root.querySelector("#editUserName").value.trim();
    const email = root.querySelector("#editUserEmail").value.trim();
    const role = root.querySelector("#editUserRole").value;
    const perms = Array.from(root.querySelectorAll(".permission-chip input[type='checkbox']"))
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    if (!name || !email) return;

    // Disable submit button while saving
    const submitBtn = root.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Speichere...";

    try {
      const userData = {
        id: user.id,
        name,
        email,
        role,
        permissions: perms.length ? perms : [...ROLE_PRESETS[role].permissions],
        worker_id: user.worker_id || user.workerId || null,
      };

      const result = await saveUserToAPI(userData);
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern des Benutzers');
      }

      close();
      await loadAllData(); // Reload all data from API
      renderApp();
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Fehler: ${error.message || 'Fehler beim Speichern. Bitte versuchen Sie es erneut.'}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

function openEditLocationModal(locationId) {
  const loc = data.locations.find((l) => l.id === locationId);
  if (!loc) return;
  const schedule = loc.schedule || { status: "Geplant", start: "", end: "", deadline: "", progress: 0 };
  
  // Parse code into siteNumber and title
  const codeParts = (loc.code || '').split(' ');
  const siteNumber = codeParts[0] || '';
  const siteTitle = codeParts.slice(1).join(' ') || loc.title || '';
  
  // Extract structured data
  const title = loc.title || siteTitle;
  const startAddress = loc.start_address || '';
  const teamLeaderName = loc.team_leader_name || '';
  const teamLeaderPhone = loc.team_leader_phone || '';
  const routeLink = loc.route_link || '';
  
  // Parse checklist from tags or use structured data
  const checklist = loc.checklist || {
    truck_access: (loc.tags || []).some(t => t.label && t.label.includes('LKW')),
    safety_briefing: (loc.tags || []).some(t => t.label && t.label.includes('Sicherheitsbriefing')),
    keys_available: (loc.tags || []).some(t => t.label && (t.label.includes('Genehmigungen') || t.label.includes('Schlüssel')))
  };
  
  // Parse vehicles and machines from tags or use structured data
  const vehicles = loc.vehicles || {
    lkw: (loc.tags || []).some(t => t.label && t.label.includes('LKW')),
    transporter: (loc.tags || []).some(t => t.label && t.label.includes('Transporter')),
    crane: (loc.tags || []).some(t => t.label && (t.label.includes('Kran') || t.label.includes('Hubwagen'))),
    excavator: (loc.tags || []).some(t => t.label && t.label.includes('Bagger')),
    forklift: (loc.tags || []).some(t => t.label && t.label.includes('Stapler'))
  };
  
  const machines = loc.machines || {
    welder: (loc.tags || []).some(t => t.label && t.label.includes('Schweiß')),
    compressor: (loc.tags || []).some(t => t.label && t.label.includes('Kompressor')),
    drill: (loc.tags || []).some(t => t.label && t.label.includes('Bohrmaschine')),
    grinder: (loc.tags || []).some(t => t.label && t.label.includes('Schleifmaschine')),
    scaffold: (loc.tags || []).some(t => t.label && t.label.includes('Gerüst')),
    hoist: (loc.tags || []).some(t => t.label && (t.label.includes('Hebezeug') || t.label.includes('Flaschenzug')))
  };
  
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay" data-close>
      <div class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="editLocTitle" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title" id="editLocTitle">Baustelle bearbeiten</div>
          <button class="btn btn--ghost" id="btn-close-editLoc">✕</button>
        </div>
        <form id="form-edit-location">
          <div class="modal__body modal__body--wide">
            <div class="modal-section">
              <div class="modal-section__title">📍 Baustellen-Informationen</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="editLocSiteNumber">Baustellen-Nr</label>
                    <input id="editLocSiteNumber" class="input" value="${siteNumber}" required />
                  </div>
                  <div class="field field--half">
                    <label for="editLocTitle">Titel</label>
                    <input id="editLocTitle" class="input" value="${title}" required />
                  </div>
                </div>
                <div class="field-row">
                  <div class="field field--two-thirds">
                    <label for="editLocAddress">Adresse (Ziel)</label>
                    <input id="editLocAddress" class="input" value="${loc.address || ''}" required />
                  </div>
                  <div class="field field--one-third">
                    <label for="editLocStartAddress">Start (optional, für Route)</label>
                    <input id="editLocStartAddress" class="input" value="${startAddress}" />
                  </div>
                </div>
                <div class="field">
                  <label for="editLocDescription">Beschreibung</label>
                  <textarea id="editLocDescription" class="input input--textarea" rows="3">${loc.description || ''}</textarea>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">👤 Teamleiter</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="editLocLeadName">Name</label>
                    <input id="editLocLeadName" class="input" value="${teamLeaderName}" required />
                  </div>
                  <div class="field field--half">
                    <label for="editLocLeadPhone">Telefon</label>
                    <input id="editLocLeadPhone" class="input" value="${teamLeaderPhone}" required />
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">✅ Checkliste</div>
              <div class="modal-section__content">
                <div class="checklist checklist--grid">
                  <div class="checkbox">
                    <input id="editChk-access" type="checkbox" ${checklist.truck_access ? 'checked' : ''} />
                    <label for="editChk-access">Zufahrt für LKW möglich</label>
                  </div>
                  <div class="checkbox">
                    <input id="editChk-briefing" type="checkbox" ${checklist.safety_briefing ? 'checked' : ''} />
                    <label for="editChk-briefing">Sicherheitsbriefing notwendig</label>
                  </div>
                  <div class="checkbox">
                    <input id="editChk-permit" type="checkbox" ${checklist.keys_available ? 'checked' : ''} />
                    <label for="editChk-permit">Genehmigungen / Schlüssel vorhanden</label>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">🚚 Fahrzeuge & Maschinen</div>
              <div class="modal-section__content">
                <div class="equipment-checklist equipment-checklist--wide">
                  <div class="equipment-section">
                    <div class="equipment-section-title">🚚 Fahrzeuge</div>
                    <div class="equipment-checkboxes equipment-checkboxes--grid">
                      <div class="checkbox">
                        <input id="editVeh-lkw" type="checkbox" value="LKW benötigt" ${vehicles.lkw ? 'checked' : ''} />
                        <label for="editVeh-lkw">LKW</label>
                      </div>
                      <div class="checkbox">
                        <input id="editVeh-transporter" type="checkbox" value="Transporter benötigt" ${vehicles.transporter ? 'checked' : ''} />
                        <label for="editVeh-transporter">Transporter</label>
                      </div>
                      <div class="checkbox">
                        <input id="editVeh-kran" type="checkbox" value="Kran benötigt" ${vehicles.crane ? 'checked' : ''} />
                        <label for="editVeh-kran">Kran / Hubwagen</label>
                      </div>
                      <div class="checkbox">
                        <input id="editVeh-bagger" type="checkbox" value="Bagger benötigt" ${vehicles.excavator ? 'checked' : ''} />
                        <label for="editVeh-bagger">Bagger</label>
                      </div>
                      <div class="checkbox">
                        <input id="editVeh-stapler" type="checkbox" value="Stapler benötigt" ${vehicles.forklift ? 'checked' : ''} />
                        <label for="editVeh-stapler">Stapler</label>
                      </div>
                    </div>
                  </div>
                  <div class="equipment-section">
                    <div class="equipment-section-title">🔧 Maschinen & Werkzeuge</div>
                    <div class="equipment-checkboxes equipment-checkboxes--grid">
                      <div class="checkbox">
                        <input id="editMach-schweiss" type="checkbox" value="Schweißen" ${machines.welder ? 'checked' : ''} />
                        <label for="editMach-schweiss">Schweißgerät</label>
                      </div>
                      <div class="checkbox">
                        <input id="editMach-kompressor" type="checkbox" value="Kompressor benötigt" ${machines.compressor ? 'checked' : ''} />
                        <label for="editMach-kompressor">Kompressor</label>
                      </div>
                      <div class="checkbox">
                        <input id="editMach-bohrmaschine" type="checkbox" value="Bohrmaschine benötigt" ${machines.drill ? 'checked' : ''} />
                        <label for="editMach-bohrmaschine">Bohrmaschine</label>
                      </div>
                      <div class="checkbox">
                        <input id="editMach-schleifmaschine" type="checkbox" value="Schleifmaschine benötigt" ${machines.grinder ? 'checked' : ''} />
                        <label for="editMach-schleifmaschine">Schleifmaschine</label>
                      </div>
                      <div class="checkbox">
                        <input id="editMach-geruest" type="checkbox" value="Gerüst benötigt" ${machines.scaffold ? 'checked' : ''} />
                        <label for="editMach-geruest">Gerüst</label>
                      </div>
                      <div class="checkbox">
                        <input id="editMach-heber" type="checkbox" value="Hebezeug benötigt" ${machines.hoist ? 'checked' : ''} />
                        <label for="editMach-heber">Hebezeug / Flaschenzug</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">🗺️ Route</div>
              <div class="modal-section__content">
                <div class="field">
                  <label>Karten-/Routenlink</label>
                  <a id="editMapsLink" class="badge badge--link" href="#" target="_blank" rel="noopener">📍 Google Maps öffnen</a>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📄 Pläne & Dokumente</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="editLocPlanUpload">Baustellen-Plan hochladen</label>
              ${loc.planFile ? `
                <div class="plan-preview-container">
                  <div class="plan-preview-header">
                    <div class="plan-preview-info">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <span class="plan-preview-name">${loc.planFileName || "Baustellen-Plan"}</span>
                    </div>
                    <button type="button" class="plan-preview-btn" data-view-plan-edit="${loc.id}">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <span>Anzeigen</span>
                    </button>
                  </div>
                  ${loc.planFile.startsWith('data:image/') ? `
                    <div class="plan-preview-image">
                      <img src="${loc.planFile}" alt="${loc.planFileName || 'Baustellen-Plan'}" />
                    </div>
                  ` : loc.planFileName && loc.planFileName.toLowerCase().endsWith('.pdf') ? `
                    <div class="plan-preview-pdf">
                      <iframe src="${loc.planFile}" class="plan-preview-iframe"></iframe>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              <div class="file-upload-container" style="${loc.planFile ? 'margin-top: 16px;' : ''}">
                <input type="file" id="editLocPlanUpload" class="file-input" accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp" />
                <label for="editLocPlanUpload" class="file-upload-label">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>${loc.planFile ? 'Neue Datei auswählen' : 'Datei auswählen'}</span>
                </label>
                <div id="editLocPlanFileName" class="file-name-display" style="display: none;">
                  <span class="file-name-text"></span>
                  <button type="button" class="file-remove-btn" id="removeEditLocPlanFile">✕</button>
                </div>
              </div>
              <small style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block;">
                Unterstützte Formate: PDF, PNG, JPG, JPEG, GIF, BMP
              </small>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-editLoc">Abbrechen</button>
            <button type="submit" class="btn btn--primary">Speichern</button>
          </div>
        </form>
      </div>
  </div>
`;

  const close = () => (root.innerHTML = "");
  root.querySelector(".modal-overlay").addEventListener("click", close);
  root.querySelector("#btn-close-editLoc").addEventListener("click", close);
  root.querySelector("#btn-cancel-editLoc").addEventListener("click", close);

  // Update Google Maps link when address/origin changes
  const editAddressEl = root.querySelector("#editLocAddress");
  const editStartAddressEl = root.querySelector("#editLocStartAddress");
  const editMapsLinkEl = root.querySelector("#editMapsLink");
  const updateEditLink = () => {
    const dest = encodeURIComponent(editAddressEl.value.trim());
    const origin = encodeURIComponent(editStartAddressEl.value.trim());
    let href = "https://www.google.com/maps/dir/?api=1";
    if (dest) href += `&destination=${dest}`;
    if (origin) href += `&origin=${origin}`;
    editMapsLinkEl.setAttribute("href", href);
  };
  editAddressEl.addEventListener("input", updateEditLink);
  editStartAddressEl.addEventListener("input", updateEditLink);
  updateEditLink();

  // File upload handler for edit modal
  let editedPlanFile = loc.planFile || null;
  let editedPlanFileName = loc.planFileName || null;
  const editPlanUploadInput = root.querySelector("#editLocPlanUpload");
  const editPlanFileNameDisplay = root.querySelector("#editLocPlanFileName");
  const editPlanFileNameText = editPlanFileNameDisplay.querySelector(".file-name-text");
  const removeEditPlanBtn = root.querySelector("#removeEditLocPlanFile");

  editPlanUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("Die Datei ist zu groß. Bitte wählen Sie eine Datei unter 10 MB.");
        editPlanUploadInput.value = "";
        return;
      }

      editedPlanFileName = file.name;
      editPlanFileNameText.textContent = file.name;
      editPlanFileNameDisplay.style.display = "flex";

      // Read file as Base64
      const reader = new FileReader();
      reader.onload = (event) => {
        editedPlanFile = event.target.result; // Base64 string
      };
      reader.readAsDataURL(file);
    }
  });

  removeEditPlanBtn.addEventListener("click", () => {
    editedPlanFile = null;
    editedPlanFileName = null;
    editPlanUploadInput.value = "";
    editPlanFileNameDisplay.style.display = "none";
    // Hide preview container if exists
    const previewContainer = root.querySelector(".plan-preview-container");
    if (previewContainer) {
      previewContainer.style.display = "none";
    }
  });

  // Add event handler for viewing plan from edit modal
  const viewPlanBtn = root.querySelector("[data-view-plan-edit]");
  if (viewPlanBtn) {
    viewPlanBtn.addEventListener("click", () => {
      openPlanViewModal(loc.id);
    });
  }

  root.querySelector("#form-edit-location").addEventListener("submit", async (e) => {
    e.preventDefault();
    const siteNumber = root.querySelector("#editLocSiteNumber").value.trim();
    const siteTitle = root.querySelector("#editLocTitle").value.trim();
    const code = `${siteNumber} ${siteTitle}`;
    const address = root.querySelector("#editLocAddress").value.trim();
    const startAddress = root.querySelector("#editLocStartAddress").value.trim();
    const description = root.querySelector("#editLocDescription").value.trim();
    const leadName = root.querySelector("#editLocLeadName").value.trim();
    const leadPhone = root.querySelector("#editLocLeadPhone").value.trim();

    if (!code || !address || !leadName || !leadPhone) return;

    // Collect checklist
    const checklist = {
      truck_access: root.querySelector("#editChk-access").checked,
      safety_briefing: root.querySelector("#editChk-briefing").checked,
      keys_available: root.querySelector("#editChk-permit").checked
    };

    // Collect vehicles
    const vehicles = {
      lkw: root.querySelector("#editVeh-lkw").checked,
      transporter: root.querySelector("#editVeh-transporter").checked,
      crane: root.querySelector("#editVeh-kran").checked,
      excavator: root.querySelector("#editVeh-bagger").checked,
      forklift: root.querySelector("#editVeh-stapler").checked
    };

    // Collect machines
    const machines = {
      welder: root.querySelector("#editMach-schweiss").checked,
      compressor: root.querySelector("#editMach-kompressor").checked,
      drill: root.querySelector("#editMach-bohrmaschine").checked,
      grinder: root.querySelector("#editMach-schleifmaschine").checked,
      scaffold: root.querySelector("#editMach-geruest").checked,
      hoist: root.querySelector("#editMach-heber").checked
    };

    // Generate route link
    const dest = encodeURIComponent(address);
    const origin = encodeURIComponent(startAddress);
    const routeLink = `https://www.google.com/maps/dir/?api=1${dest ? `&destination=${dest}` : ''}${origin ? `&origin=${origin}` : ''}`;

    // Disable submit button while saving
    const submitBtn = root.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Speichere...";

    try {
      const locationData = {
        id: loc.id,
        code,
        title: siteTitle,
        address,
        start_address: startAddress || null,
        description: description || null,
        team_leader_name: leadName,
        team_leader_phone: leadPhone,
        route_link: routeLink,
        checklist: checklist,
        vehicles: vehicles,
        machines: machines,
        schedule: loc.schedule || {
          status: "Geplant",
          start: "",
          end: "",
          deadline: "",
          progress: 0,
        },
        tags: loc.tags || [],
        crew: loc.crew || [],
      };
      
      // Update plan file if changed
      if (editedPlanFile !== null || editedPlanFileName === null) {
        locationData.planFile = editedPlanFile;
        locationData.planFileName = editedPlanFileName;
      } else {
        // Keep existing plan
        locationData.planFile = loc.planFile;
        locationData.planFileName = loc.planFileName;
      }

      const result = await saveLocationToAPI(locationData);
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern der Baustelle');
      }

      close();
      await loadAllData(); // Reload all data from API
      renderApp();
    } catch (error) {
      console.error('Error updating location:', error);
      alert(`Fehler: ${error.message || 'Fehler beim Speichern. Bitte versuchen Sie es erneut.'}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// formatDateTime und formatDate wurden nach oben verschoben (siehe Zeile 3263-3285)

function toInputDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

// slugifyStatus wurde nach oben verschoben (siehe Zeile 3287)

// Team Management Functions
function openAddTeamModal() {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay" data-close>
      <div class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="addTeamTitle" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title" id="addTeamTitle">Team erstellen</div>
          <button class="btn btn--ghost" id="btn-close-team">✕</button>
        </div>
        <form id="form-add-team">
          <div class="modal__body modal__body--wide">
            <div class="modal-section">
              <div class="modal-section__title">📋 Team-Informationen</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--two-thirds">
                    <label for="teamName">Team-Name *</label>
                    <input id="teamName" class="input" placeholder="z.B. AFT Bau" required />
                  </div>
                  <div class="field field--one-third">
                    <label for="teamType">Team-Typ *</label>
                    <select id="teamType" class="select" required>
                      <option value="intern">Intern</option>
                      <option value="extern">Externe Firma</option>
                    </select>
                  </div>
                </div>
                <div class="field">
                  <label for="teamCompany">Firmenname *</label>
                  <input id="teamCompany" class="input" placeholder="z.B. AFT Bau GmbH" required />
                </div>
                <div class="field">
                  <label for="teamDescription">Beschreibung</label>
                  <textarea id="teamDescription" class="input input--textarea" placeholder="Kurzbeschreibung des Teams" rows="3"></textarea>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📞 Kontaktinformationen</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="teamPhone">Telefon *</label>
                    <input id="teamPhone" class="input" placeholder="+41 ..." required />
                  </div>
                  <div class="field field--half">
                    <label for="teamEmail">E-Mail *</label>
                    <input id="teamEmail" type="email" class="input" placeholder="team@firma.ch" required />
                  </div>
                </div>
                <div class="field">
                  <label for="teamAddress">Adresse</label>
                  <input id="teamAddress" class="input" placeholder="Strasse Nr, PLZ Ort" />
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">👥 Team-Mitglieder</div>
              <div class="modal-section__content">
                <div class="field">
                  <label>Verfügbare Mitarbeiter hinzufügen</label>
                  <div class="team-members-selector">
                    ${data.workers.filter(w => !w.teamId).map((worker) => `
                      <label class="member-checkbox">
                        <input type="checkbox" value="${worker.id}" name="team-members" />
                        <div class="member-info">
                          <div class="member-name">${worker.name}</div>
                          <div class="member-role">${worker.role} - ${worker.company}</div>
                        </div>
                      </label>
                    `).join("")}
                    ${data.workers.filter(w => !w.teamId).length === 0 ? `
                      <div class="empty-hint">Alle Mitarbeiter sind bereits Teams zugewiesen</div>
                    ` : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-team">Abbrechen</button>
            <button type="submit" class="btn btn--primary">Team erstellen</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = root.querySelector(".modal-overlay");
  const close = () => (root.innerHTML = "");
  overlay.addEventListener("click", close);
  root.querySelector("#btn-close-team").addEventListener("click", close);
  root.querySelector("#btn-cancel-team").addEventListener("click", close);

  root.querySelector("#form-add-team").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = root.querySelector("#teamName").value.trim();
    const type = root.querySelector("#teamType").value;
    const company = root.querySelector("#teamCompany").value.trim();
    const description = root.querySelector("#teamDescription").value.trim() || "";
    const phone = root.querySelector("#teamPhone").value.trim();
    const email = root.querySelector("#teamEmail").value.trim();
    const address = root.querySelector("#teamAddress").value.trim() || "";
    
    const selectedMembers = Array.from(root.querySelectorAll("input[name='team-members']:checked"))
      .map(cb => cb.value);

    if (!name || !company || !phone || !email) return;

    // Disable submit button while saving
    const submitBtn = root.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Speichere...";

    try {
      const newTeam = {
        id: `team-${Date.now()}`,
        name,
        type,
        company,
        description,
        contact: { phone, email, address },
        members: selectedMembers,
        created_at: new Date().toISOString().split('T')[0],
        is_active: true
      };

      const result = await saveTeamToAPI(newTeam);
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern des Teams');
      }

      close();
      await loadAllData(); // Reload all data from API
      renderApp();
    } catch (error) {
      console.error('Error creating team:', error);
      alert(`Fehler: ${error.message || 'Fehler beim Speichern. Bitte versuchen Sie es erneut.'}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

function openEditTeamModal(teamId) {
  const team = data.teams.find(t => t.id === teamId);
  if (!team) return;

  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-overlay" data-close>
      <div class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="editTeamTitle" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title" id="editTeamTitle">Team bearbeiten</div>
          <button class="btn btn--ghost" id="btn-close-edit-team">✕</button>
        </div>
        <form id="form-edit-team">
          <div class="modal__body modal__body--wide">
            <div class="modal-section">
              <div class="modal-section__title">📋 Team-Informationen</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--two-thirds">
                    <label for="editTeamName">Team-Name *</label>
                    <input id="editTeamName" class="input" value="${team.name}" required />
                  </div>
                  <div class="field field--one-third">
                    <label for="editTeamType">Team-Typ *</label>
                    <select id="editTeamType" class="select" required>
                      <option value="intern" ${team.type === "intern" ? "selected" : ""}>Intern</option>
                      <option value="extern" ${team.type === "extern" ? "selected" : ""}>Externe Firma</option>
                    </select>
                  </div>
                </div>
                <div class="field">
                  <label for="editTeamCompany">Firmenname *</label>
                  <input id="editTeamCompany" class="input" value="${team.company}" required />
                </div>
                <div class="field">
                  <label for="editTeamDescription">Beschreibung</label>
                  <textarea id="editTeamDescription" class="input input--textarea" rows="3">${team.description || ""}</textarea>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📞 Kontaktinformationen</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="editTeamPhone">Telefon *</label>
                    <input id="editTeamPhone" class="input" value="${team.contact.phone}" required />
                  </div>
                  <div class="field field--half">
                    <label for="editTeamEmail">E-Mail *</label>
                    <input id="editTeamEmail" type="email" class="input" value="${team.contact.email}" required />
                  </div>
                </div>
                <div class="field">
                  <label for="editTeamAddress">Adresse</label>
                  <input id="editTeamAddress" class="input" value="${team.contact.address || ""}" />
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">👥 Team-Mitglieder</div>
              <div class="modal-section__content">
                <div class="field">
                  <label>Aktuelle Mitglieder</label>
                  <div class="team-members-list">
                    ${team.members.map(memberId => {
                      const worker = data.workers.find(w => w.id === memberId);
                      if (!worker) return "";
                      return `
                        <div class="team-member-item">
                          <div class="team-member-avatar">${worker.name.split(" ").map(n => n[0]).join("")}</div>
                          <div class="team-member-info">
                            <div class="team-member-name">${worker.name}</div>
                            <div class="team-member-role">${worker.role}</div>
                          </div>
                          <button type="button" class="btn btn--ghost btn--small" data-remove-member="${memberId}">Entfernen</button>
                        </div>
                      `;
                    }).join("")}
                  </div>
                </div>
                <div class="field">
                  <label>Weitere Mitarbeiter hinzufügen</label>
                  <div class="team-members-selector">
                    ${data.workers.filter(w => !w.teamId || w.teamId === team.id).map((worker) => {
                      const isMember = team.members.includes(worker.id);
                      return `
                        <label class="member-checkbox">
                          <input type="checkbox" value="${worker.id}" name="edit-team-members" ${isMember ? "checked" : ""} />
                          <div class="member-info">
                            <div class="member-name">${worker.name}</div>
                            <div class="member-role">${worker.role} - ${worker.company}</div>
                          </div>
                        </label>
                      `;
                    }).join("")}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-edit-team">Abbrechen</button>
            <button type="submit" class="btn btn--primary">Änderungen speichern</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = root.querySelector(".modal-overlay");
  const close = () => (root.innerHTML = "");
  overlay.addEventListener("click", close);
  root.querySelector("#btn-close-edit-team").addEventListener("click", close);
  root.querySelector("#btn-cancel-edit-team").addEventListener("click", close);

  // Remove member handlers
  root.querySelectorAll("[data-remove-member]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const memberId = btn.getAttribute("data-remove-member");
      // Update team via API - remove member
      const updatedMembers = team.members.filter(id => id !== memberId);
      const updatedTeam = { ...team, members: updatedMembers };
      
      try {
        const result = await saveTeamToAPI(updatedTeam);
        if (result.success) {
          // Reload all data
          await loadAllData();
          close();
          openEditTeamModal(teamId);
        }
      } catch (error) {
        console.error('Error removing team member:', error);
      }
    });
  });

  root.querySelector("#form-edit-team").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = root.querySelector("#editTeamName").value.trim();
    const type = root.querySelector("#editTeamType").value;
    const company = root.querySelector("#editTeamCompany").value.trim();
    const description = root.querySelector("#editTeamDescription").value.trim();
    const phone = root.querySelector("#editTeamPhone").value.trim();
    const email = root.querySelector("#editTeamEmail").value.trim();
    const address = root.querySelector("#editTeamAddress").value.trim();
    
    const selectedMembers = Array.from(root.querySelectorAll("input[name='edit-team-members']:checked"))
      .map(cb => cb.value);

    if (!name || !company || !phone || !email) return;

    // Disable submit button while saving
    const submitBtn = root.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Speichere...";

    try {
      // Update team via API
      const updatedTeam = {
        id: team.id,
        name,
        type,
        company,
        description,
        contact: { phone, email, address },
        members: selectedMembers,
        is_active: team.is_active !== false
      };

      const result = await saveTeamToAPI(updatedTeam);
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern des Teams');
      }

      close();
      await loadAllData(); // Reload all data from API
      renderApp();
    } catch (error) {
      console.error('Error updating team:', error);
      alert(`Fehler: ${error.message || 'Fehler beim Speichern. Bitte versuchen Sie es erneut.'}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Fullscreen functionality
function attachFullscreenHandlers() {
  const fullscreenBtn = document.getElementById("btn-fullscreen");
  if (!fullscreenBtn) return;

  // Toggle fullscreen on button click
  fullscreenBtn.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        updateFullscreenIcon(true);
      } else {
        await document.exitFullscreen();
        updateFullscreenIcon(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  });

  // Listen for fullscreen changes (ESC key, browser controls, etc.)
  document.addEventListener("fullscreenchange", () => {
    updateFullscreenIcon(!!document.fullscreenElement);
  });

  // Handle ESC key to exit fullscreen
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      updateFullscreenIcon(false);
    }
  });
}

function updateFullscreenIcon(isFullscreen) {
  const fullscreenBtn = document.getElementById("btn-fullscreen");
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

// renderLocationCard() wurde nach oben verschoben (siehe Zeile 4876)

// ============================================
// API Integration Functions
// ============================================

// Load all data from API
async function loadAllData() {
  try {
    // Load all data in parallel
    const [usersResponse, workersResponse, teamsResponse, locationsResponse, assignmentsResponse, timeEntriesResponse] = await Promise.all([
      api.getUsers().catch(() => ({ success: false, data: [] })),
      api.getWorkers().catch(() => ({ success: false, data: [] })),
      api.getTeams().catch(() => ({ success: false, data: [] })),
      api.getLocations().catch(() => ({ success: false, data: [] })),
      api.getAssignments().catch(() => ({ success: false, data: [] })),
      api.getTimeEntries().catch(() => ({ success: false, data: [] }))
    ]);
    
    // Update data object
    if (usersResponse.success) {
      // Normalize worker_id to workerId for all users (Backend compatibility)
      data.users = (usersResponse.data || []).map(user => {
        const normalized = { ...user };
        // Map worker_id to workerId if present
        if (normalized.worker_id && !normalized.workerId) {
          normalized.workerId = normalized.worker_id;
        }
        return normalized;
      });
    }
    if (workersResponse.success) {
      data.workers = (workersResponse.data || []).map(worker => {
        // Normalize worker data structure
        const normalized = { ...worker };
        
        // Normalize contact data (API returns contact_phone/contact_email, frontend expects contact object)
        if (!normalized.contact) {
          normalized.contact = {};
        }
        if (worker.contact_phone && !normalized.contact.phone) {
          normalized.contact.phone = worker.contact_phone;
        }
        if (worker.contact_email && !normalized.contact.email) {
          normalized.contact.email = worker.contact_email;
        }
        
        // Ensure availability array exists
        if (!normalized.availability) {
          normalized.availability = [];
        }
        
        return normalized;
      });
    }
    if (teamsResponse.success) {
      data.teams = teamsResponse.data || [];
    }
    if (locationsResponse.success) {
      data.locations = locationsResponse.data || [];
    }
    if (assignmentsResponse.success) {
      // Process assignments to update workers' availability and locations' crew
      const assignments = assignmentsResponse.data || [];
      processAssignments(assignments);
    }
    if (timeEntriesResponse.success) {
      data.timeEntries = timeEntriesResponse.data || [];
    }
    
    return true;
  } catch (error) {
    console.error('Error loading data:', error);
    return false;
  }
}

// Process assignments and update workers' availability and locations' crew
function processAssignments(assignments) {
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  
  // First, clear existing availability and crew data that comes from assignments
  // We'll rebuild them from the database assignments
  data.workers.forEach(worker => {
    if (worker.availability) {
      // Remove availability entries that have a date (these come from assignments)
      worker.availability = worker.availability.filter(a => !a.date);
    }
  });
  
  // Clear crew data from locations (we'll rebuild from assignments)
  data.locations.forEach(location => {
    location.crew = [];
  });
  
  // Now process all assignments and rebuild availability and crew
  assignments.forEach(assignment => {
    if (assignment.worker_id) {
      const worker = data.workers.find(w => w.id === assignment.worker_id);
      if (worker) {
        const assignmentDate = new Date(assignment.assignment_date);
        const dayOfWeek = assignmentDate.getDay();
        const dayName = dayNames[dayOfWeek];
        
        const location = data.locations.find(l => l.id === assignment.location_id);
        const site = location ? (location.code || location.address) : '';
        
        // Add to worker availability
        if (!worker.availability) worker.availability = [];
        
        // Check if this exact assignment already exists
        const existing = worker.availability.find(a => 
          a.day === dayName && 
          (a.site === site || a.site === location?.address || a.site === location?.code) && 
          a.date === assignment.assignment_date
        );
        
        if (!existing) {
          worker.availability.push({
            day: dayName,
            from: assignment.time_from || '07:00',
            to: assignment.time_to || '16:00',
            job: 'Einsatz',
            site: site || location?.address || '',
            date: assignment.assignment_date
          });
        }
      }
    }
    
    // Update location crew - group by date to show all workers for each date
    const location = data.locations.find(l => l.id === assignment.location_id);
    if (location) {
      if (!location.crew) location.crew = [];
      
      if (assignment.worker_id) {
        const worker = data.workers.find(w => w.id === assignment.worker_id);
        if (worker) {
          // Check if worker is already in crew for this date
          const existingCrewMember = location.crew.find(c => 
            (c.worker_id === worker.id || c.name === worker.name) && 
            c.date === assignment.assignment_date
          );
          
          if (!existingCrewMember) {
            location.crew.push({
              id: worker.id,
              name: worker.name,
              worker_id: worker.id,
              time: `${assignment.time_from || '07:00'} - ${assignment.time_to || '16:00'}`,
              date: assignment.assignment_date
            });
          }
        }
      } else if (assignment.team_id) {
        const team = data.teams.find(t => t.id === assignment.team_id);
        if (team) {
          // For teams, add team members to crew
          if (team.members && Array.isArray(team.members)) {
            team.members.forEach(workerId => {
              const worker = data.workers.find(w => w.id === workerId);
              if (worker) {
                const existingCrewMember = location.crew.find(c => 
                  (c.worker_id === worker.id || c.name === worker.name) && 
                  c.date === assignment.assignment_date
                );
                
                if (!existingCrewMember) {
                  location.crew.push({
                    id: worker.id,
                    name: worker.name,
                    worker_id: worker.id,
                    time: `${assignment.time_from || '07:00'} - ${assignment.time_to || '16:00'}`,
                    date: assignment.assignment_date
                  });
                }
              }
            });
          }
        }
      }
    }
  });
}

// Login function using API
async function loginWithAPI(username, password) {
  try {
    const response = await api.login(username, password);
    if (response.success && response.user) {
      data.currentUser = response.user;
      // Ensure workerId is set (map from worker_id if needed)
      if (!data.currentUser.workerId && data.currentUser.worker_id) {
        data.currentUser.workerId = data.currentUser.worker_id;
      }
      uiState.isAuthenticated = true;
      uiState.currentUserId = response.user.id;
      
      // Load all data after successful login
      await loadAllData();
      
      return { success: true, user: response.user };
    } else {
      return { success: false, error: response.error || 'Login failed' };
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Verbesserte Fehlermeldung für fetch-Fehler
    let errorMessage = error.message || 'Login failed';
    if (error.message === 'Failed to fetch' || error.name === 'NetworkError' || error.name === 'TypeError') {
      errorMessage = 'Verbindung zum Server fehlgeschlagen. Bitte überprüfen Sie, ob der Server läuft.';
    }
    
    return { success: false, error: errorMessage };
  }
}

// Save user to API
async function saveUserToAPI(userData) {
  try {
    let response;
    
    if (userData.id && data.users.find(u => u.id === userData.id)) {
      // Update existing user
      response = await api.updateUser(userData.id, userData);
    } else {
      // Create new user
      response = await api.createUser(userData);
    }
    
    console.log('API Response:', response);
    
    if (!response || !response.success) {
      const errorMsg = response?.error || 'Failed to save user';
      console.error('API Error:', errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // Reload users to sync with database
    const usersResponse = await api.getUsers();
    if (usersResponse && usersResponse.success) {
      // Normalize worker_id to workerId for all users (Backend compatibility)
      data.users = (usersResponse.data || []).map(user => {
        const normalized = { ...user };
        // Map worker_id to workerId if present
        if (normalized.worker_id && !normalized.workerId) {
          normalized.workerId = normalized.worker_id;
        }
        return normalized;
      });
    }
    
    return { success: true, id: response.id || userData.id };
  } catch (error) {
    console.error('Error saving user:', error);
    return { success: false, error: error.message || 'Failed to save user' };
  }
}

// Save worker to API
async function saveWorkerToAPI(workerData) {
  try {
    if (workerData.id && data.workers.find(w => w.id === workerData.id)) {
      // Update existing worker
      const response = await api.updateWorker(workerData.id, workerData);
      if (response.success) {
        // Reload workers
        const workersResponse = await api.getWorkers();
        if (workersResponse.success) {
          data.workers = workersResponse.data || [];
        }
        return { success: true };
      }
    } else {
      // Create new worker
      const response = await api.createWorker(workerData);
      if (response.success && response.id) {
        // Reload workers
        const workersResponse = await api.getWorkers();
        if (workersResponse.success) {
          data.workers = workersResponse.data || [];
        }
        return { success: true, id: response.id };
      }
    }
    return { success: false, error: 'Failed to save worker' };
  } catch (error) {
    console.error('Error saving worker:', error);
    return { success: false, error: error.message || 'Failed to save worker' };
  }
}

// Save team to API
async function saveTeamToAPI(teamData) {
  try {
    if (teamData.id && data.teams.find(t => t.id === teamData.id)) {
      // Update existing team
      const response = await api.updateTeam(teamData.id, teamData);
      if (response.success) {
        // Reload teams and workers (workers might have updated team_id)
        const [teamsResponse, workersResponse] = await Promise.all([
          api.getTeams(),
          api.getWorkers()
        ]);
        if (teamsResponse.success) data.teams = teamsResponse.data || [];
        if (workersResponse.success) data.workers = workersResponse.data || [];
        return { success: true };
      }
    } else {
      // Create new team
      const response = await api.createTeam(teamData);
      if (response.success && response.id) {
        // Reload teams and workers
        const [teamsResponse, workersResponse] = await Promise.all([
          api.getTeams(),
          api.getWorkers()
        ]);
        if (teamsResponse.success) data.teams = teamsResponse.data || [];
        if (workersResponse.success) data.workers = workersResponse.data || [];
        return { success: true, id: response.id };
      }
    }
    return { success: false, error: 'Failed to save team' };
  } catch (error) {
    console.error('Error saving team:', error);
    return { success: false, error: error.message || 'Failed to save team' };
  }
}

// Save location to API
async function saveLocationToAPI(locationData) {
  try {
    if (locationData.id && data.locations.find(l => l.id === locationData.id)) {
      // Update existing location
      const response = await api.updateLocation(locationData.id, locationData);
      if (response.success) {
        // Reload locations
        const locationsResponse = await api.getLocations();
        if (locationsResponse.success) {
          data.locations = locationsResponse.data || [];
        }
        return { success: true };
      }
    } else {
      // Create new location
      const response = await api.createLocation(locationData);
      if (response.success && response.id) {
        // Reload locations
        const locationsResponse = await api.getLocations();
        if (locationsResponse.success) {
          data.locations = locationsResponse.data || [];
        }
        return { success: true, id: response.id };
      }
    }
    return { success: false, error: 'Failed to save location' };
  } catch (error) {
    console.error('Error saving location:', error);
    return { success: false, error: error.message || 'Failed to save location' };
  }
}

// Save assignment to API
async function saveAssignmentToAPI(assignmentData) {
  try {
    const response = await api.createAssignment(assignmentData);
    if (response.success) {
      // Reload ALL assignments to ensure UI is in sync with database
      const assignmentsResponse = await api.getAssignments();
      if (assignmentsResponse.success) {
        processAssignments(assignmentsResponse.data || []);
      }
      return { success: true };
    }
    return { success: false, error: 'Failed to save assignment' };
  } catch (error) {
    console.error('Error saving assignment:', error);
    return { success: false, error: error.message || 'Failed to save assignment' };
  }
}

// Override data manipulation functions to use API
const originalDataMethods = {
  push: Array.prototype.push,
  unshift: Array.prototype.unshift,
  splice: Array.prototype.splice
};

// Check if user is already logged in (has active session)
async function checkCurrentSession() {
  try {
    const response = await api.getCurrentUser();
    if (response.success && response.user) {
      // User has active session
      data.currentUser = response.user;
      // Ensure workerId is set (map from worker_id if needed)
      if (!data.currentUser.workerId && data.currentUser.worker_id) {
        data.currentUser.workerId = data.currentUser.worker_id;
      }
      uiState.isAuthenticated = true;
      uiState.currentUserId = response.user.id;
      return true;
    }
  } catch (error) {
    // No active session or error
    console.log('No active session:', error.message);
    return false;
  }
  return false;
}

// ============================================
// Time Entry / Zeiterfassung Functions
// ============================================

const timeEntryState = {
  isModalOpen: false,
  editingEntry: null,
  locationId: null,
  date: null,
  dayName: null
};

// ============================================
// Time Entry / Zeiterfassung Functions
// ============================================

// Render time entry modal/drawer
function renderTimeEntryModal() {
  if (!timeEntryState.isModalOpen) return '';
  
  const location = data.locations.find(l => l.id === timeEntryState.locationId);
  const locationName = location ? `${location.code} - ${location.address}` : '';
  const dateDisplay = timeEntryState.date ? new Date(timeEntryState.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
  
  const categories = [
    { value: 'BUERO_ALLGEMEIN', label: 'Büro allgemein' },
    { value: 'ENTWICKLUNG', label: 'Entwicklung' },
    { value: 'MEETING', label: 'Meeting' },
    { value: 'KRANKHEIT', label: 'Krankheit' },
    { value: 'TRAINING', label: 'Training' },
    { value: 'PAUSE', label: 'Pause' }
  ];
  
  // Generate time options (15-minute intervals)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      timeOptions.push(timeStr);
    }
  }
  
  // Get existing entry data if editing
  const entry = timeEntryState.editingEntry;
  const startTime = entry?.time_from || '08:00';
  const endTime = entry?.time_to || '12:00';
  const category = entry?.category || 'BUERO_ALLGEMEIN';
  const notes = entry?.notes || '';
  
  return `
    <div class="time-entry-modal-overlay" id="time-entry-modal-overlay">
      <div class="time-entry-modal" id="time-entry-modal">
        <div class="time-entry-modal__header">
          <h3 class="time-entry-modal__title">${entry ? 'Zeiteintrag bearbeiten' : 'Zeit erfassen'}</h3>
          <button class="time-entry-modal__close" id="time-entry-modal-close" title="Schließen">✕</button>
        </div>
        <div class="time-entry-modal__body">
          <div class="time-entry-modal__info">
            <div class="info-row">
              <span class="info-label">Baustelle:</span>
              <span class="info-value">${locationName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Datum:</span>
              <span class="info-value">${dateDisplay}</span>
            </div>
          </div>
          
          <div class="time-entry-form">
            <div class="form-group">
              <label class="form-label" for="time-entry-start">Startzeit *</label>
              <select class="form-select" id="time-entry-start" required>
                ${timeOptions.map(time => `
                  <option value="${time}" ${time === startTime ? 'selected' : ''}>${time}</option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="time-entry-end">Endzeit *</label>
              <select class="form-select" id="time-entry-end" required>
                ${timeOptions.map(time => `
                  <option value="${time}" ${time === endTime ? 'selected' : ''}>${time}</option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="time-entry-category">Kategorie *</label>
              <select class="form-select" id="time-entry-category" required>
                ${categories.map(cat => `
                  <option value="${cat.value}" ${category === cat.value ? 'selected' : ''}>${cat.label}</option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="time-entry-notes">Notiz (optional)</label>
              <textarea class="form-textarea" id="time-entry-notes" rows="3" placeholder="Zusätzliche Informationen...">${notes}</textarea>
            </div>
            
            ${!entry ? `
            <div class="form-group" id="auto-fill-group" style="display: none;">
              <label class="form-checkbox-label">
                <input type="checkbox" id="auto-fill-sickness" />
                <span>Ganzen Tag ausfüllen (8.5h, ersetzt vorhandene Einträge)</span>
              </label>
            </div>
            ` : ''}
            
            <div class="time-entry-preview" id="time-entry-preview">
              <span class="preview-label">Dauer:</span>
              <span class="preview-value" id="time-entry-duration">--:--</span>
            </div>
          </div>
        </div>
        
        <div class="time-entry-modal__footer">
          <button class="btn-secondary" id="time-entry-modal-cancel">Abbrechen</button>
          <button class="btn-primary" id="time-entry-modal-save">${entry ? 'Aktualisieren' : 'Speichern'}</button>
        </div>
      </div>
    </div>
  `;
}

// Calculate duration between two times
// FIX #2: Use centralized helper (deprecated, use durationMinutes instead)
function calculateDuration(timeFrom, timeTo) {
  return durationMinutes(timeFrom, timeTo);
}

// Format duration as hours:minutes
function formatDuration(minutes) {
  if (!minutes) return '0:00';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
}

// FIX #5: Validate time entry (check overlaps) with midnight handling
function validateTimeEntry(workerId, date, timeFrom, timeTo, excludeEntryId = null) {
  const dayEntries = (data.timeEntries || []).filter(entry => 
    entry.worker_id === workerId &&
    entry.entry_date === date &&
    (!excludeEntryId || entry.id !== excludeEntryId)
  );
  
  // FIX #2: Use centralized helper for midnight handling
  const fromMinutes = parseHHMMToMinutes(timeFrom);
  const toMinutes = parseHHMMToMinutes(timeTo);
  const toMinutesAdjusted = toMinutes <= fromMinutes ? toMinutes + (24 * 60) : toMinutes;
  
  for (const entry of dayEntries) {
    if (!entry.time_from || !entry.time_to) continue;
    
    const entryFromMinutes = parseHHMMToMinutes(entry.time_from);
    const entryToMinutes = parseHHMMToMinutes(entry.time_to);
    const entryToMinutesAdjusted = entryToMinutes <= entryFromMinutes ? entryToMinutes + (24 * 60) : entryToMinutes;
    
    // Check if times overlap (handling midnight crossover)
    // Overlap if: newStart < existingEnd AND newEnd > existingStart
    if ((fromMinutes < entryToMinutesAdjusted && toMinutesAdjusted > entryFromMinutes)) {
      return {
        valid: false,
        error: `Zeiteintrag überlappt mit bestehendem Eintrag (${entry.time_from}–${entry.time_to})`
      };
    }
  }
  
  return { valid: true };
}

// Open time entry modal
function openTimeEntryModal(locationId, date, dayName, entryId = null, suggestedStartTime = null, suggestedEndTime = null) {
  timeEntryState.isModalOpen = true;
  timeEntryState.locationId = locationId;
  timeEntryState.date = date;
  timeEntryState.dayName = dayName;
  timeEntryState.editingEntry = entryId ? data.timeEntries.find(e => e.id === entryId) : null;
  
  renderApp();
  
  // Update duration on time change
  const startSelect = document.getElementById('time-entry-start');
  const endSelect = document.getElementById('time-entry-end');
  const durationEl = document.getElementById('time-entry-duration');
  
  // Set suggested times if provided (for slot clicks)
  if (!timeEntryState.editingEntry && suggestedStartTime && suggestedEndTime) {
    if (startSelect) startSelect.value = suggestedStartTime;
    if (endSelect) endSelect.value = suggestedEndTime;
  }
  
  const updateDuration = () => {
    if (startSelect && endSelect && durationEl) {
      const duration = calculateDuration(startSelect.value, endSelect.value);
      const hours = duration / 60;
      durationEl.textContent = `${hours.toFixed(2)}h (${formatDuration(duration)})`;
      durationEl.classList.toggle('error', duration <= 0 || duration > 1440); // Max 24h
    }
  };
  
  const categorySelect = document.getElementById('time-entry-category');
  const autoFillGroup = document.getElementById('auto-fill-group');
  const autoFillCheckbox = document.getElementById('auto-fill-sickness');
  
  // Auto-fill logic for sickness/vacation
  const handleCategoryChange = () => {
    if (categorySelect && autoFillGroup && autoFillCheckbox) {
      const selectedCategory = categorySelect.value;
      if (selectedCategory === 'KRANKHEIT' || selectedCategory === 'FERIEN') {
        autoFillGroup.style.display = 'block';
        
        // Auto-fill times if category changed to sickness
        if (selectedCategory === 'KRANKHEIT' && !timeEntryState.editingEntry) {
          const workHours = getDefaultWorkHours();
          if (startSelect) startSelect.value = workHours.workday_start;
          if (endSelect) endSelect.value = workHours.workday_end;
          autoFillCheckbox.checked = true;
          updateDuration();
        }
      } else {
        autoFillGroup.style.display = 'none';
        if (autoFillCheckbox) autoFillCheckbox.checked = false;
      }
    }
  };
  
  if (startSelect) startSelect.addEventListener('change', updateDuration);
  if (endSelect) endSelect.addEventListener('change', updateDuration);
  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      handleCategoryChange();
      updateDuration();
    });
  }
  
  // Auto-fill checkbox handler
  if (autoFillCheckbox) {
    autoFillCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        const workHours = getDefaultWorkHours();
        if (startSelect) startSelect.value = workHours.workday_start;
        if (endSelect) endSelect.value = workHours.workday_end;
        updateDuration();
      }
    });
  }
  
  updateDuration();
  handleCategoryChange();
}

// Close time entry modal
function closeTimeEntryModal() {
  timeEntryState.isModalOpen = false;
  timeEntryState.editingEntry = null;
  timeEntryState.locationId = null;
  timeEntryState.date = null;
  timeEntryState.dayName = null;
  renderApp();
}

// Save time entry
async function saveTimeEntry() {
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  if (!activeWorkerId && !activeUserId) {
    alert('Kein Mitarbeiter oder User zugeordnet');
    return;
  }
  
  const locationId = timeEntryState.locationId;
  const date = timeEntryState.date;
  const timeFrom = document.getElementById('time-entry-start')?.value;
  const timeTo = document.getElementById('time-entry-end')?.value;
  const category = document.getElementById('time-entry-category')?.value;
  const notes = document.getElementById('time-entry-notes')?.value || '';
  const autoFill = document.getElementById('auto-fill-sickness')?.checked || false;
  
  if (!timeFrom || !timeTo || !category) {
    alert('Bitte alle Pflichtfelder ausfüllen');
    return;
  }
  
  // Validate time order
  if (timeFrom >= timeTo) {
    alert('Endzeit muss nach Startzeit liegen');
    return;
  }
  
  // Check for existing entries if auto-fill is enabled
  const existingEntries = (data.timeEntries || []).filter(entry => {
    if (activeWorkerId) {
      return entry.worker_id === activeWorkerId && entry.entry_date === date;
    } else {
      return entry.user_id === activeUserId && entry.entry_date === date;
    }
  });
  
  let autoReplace = false;
  if (autoFill && (category === 'KRANKHEIT' || category === 'FERIEN') && existingEntries.length > 0 && !timeEntryState.editingEntry) {
    const replace = confirm(`Der Tag hat bereits ${existingEntries.length} Zeiteintrag(e). Sollen diese durch "${category === 'KRANKHEIT' ? 'Krankheit' : 'Ferien'}" ersetzt werden?`);
    if (!replace) {
      return; // User cancelled
    }
    autoReplace = true;
  } else if (!autoFill) {
    // Validate overlaps (client-side check) only if not auto-replacing
    const validation = validateTimeEntry(activeWorkerId || activeUserId, date, timeFrom, timeTo, timeEntryState.editingEntry?.id);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
  }
  
  const saveBtn = document.getElementById('time-entry-modal-save');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Speichere...';
  }
  
  try {
    const entryData = {
      location_id: locationId,
      date: date,
      time_from: timeFrom,
      time_to: timeTo,
      category: category,
      notes: notes,
      auto_replace: autoReplace
    };
    
    // Set worker_id or user_id based on what's available
    if (activeWorkerId) {
      entryData.worker_id = activeWorkerId;
    } else if (activeUserId) {
      entryData.user_id = activeUserId;
    }
    
    let response;
    if (timeEntryState.editingEntry) {
      response = await api.updateTimeEntry(timeEntryState.editingEntry.id, entryData);
    } else {
      response = await api.createTimeEntry(entryData);
    }
    
    if (response.success) {
      // Reload time entries
      await loadTimeEntries();
      closeTimeEntryModal();
      renderApp();
    } else {
      alert(response.error || 'Fehler beim Speichern');
    }
  } catch (error) {
    console.error('Error saving time entry:', error);
    alert('Fehler beim Speichern: ' + error.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = timeEntryState.editingEntry ? 'Aktualisieren' : 'Speichern';
    }
  }
}

// Delete time entry
async function deleteTimeEntry(entryId) {
  if (!confirm('Zeiteintrag wirklich löschen?')) return;
  
  try {
    const response = await api.deleteTimeEntry(entryId);
    if (response.success) {
      await loadTimeEntries();
      renderApp();
    } else {
      alert(response.error || 'Fehler beim Löschen');
    }
  } catch (error) {
    console.error('Error deleting time entry:', error);
    alert('Fehler beim Löschen: ' + error.message);
  }
}

// Load time entries
async function loadTimeEntries(dateFrom = null, dateTo = null) {
  // Use calendarViewUserId for viewing (admin can view other users' calendars)
  const calendarViewUserId = getCalendarViewUserId();
  const viewUser = calendarViewUserId ? data.users.find(u => u.id === calendarViewUserId) : null;
  const activeWorkerId = viewUser?.workerId || null;
  const activeUserId = calendarViewUserId || null;
  
  const DEBUG = true;
  if (DEBUG) {
    console.log('[LoadEntries]', {
      calendarViewUserId: calendarViewUserId,
      calendarViewUserId_state: uiState.calendarViewUserId,
      activeWorkerId: activeWorkerId,
      activeUserId: activeUserId,
      dateFrom: dateFrom,
      dateTo: dateTo
    });
  }
  try {
    
    if (!activeWorkerId && !activeUserId) {
      data.timeEntries = [];
      return;
    }
    
    // Build query params - use activeCalendarUserId for admin planning
    const params = {};
    if (activeWorkerId) {
      params.worker_id = activeWorkerId;
    } else if (activeUserId) {
      params.user_id = activeUserId;
    }
    
    // Add date range if provided (for better performance)
    if (dateFrom) {
      params.date_from = dateFrom;
    }
    if (dateTo) {
      params.date_to = dateTo;
    }
    
    console.log('[loadTimeEntries] Loading entries for:', {
      activeWorkerId,
      activeUserId,
      selectedUserId: uiState.selectedUserId,
      params
    });
    
    const response = await api.getTimeEntries(params);
    if (response.success) {
      data.timeEntries = response.data || [];
      console.log('[loadTimeEntries] Loaded', data.timeEntries.length, 'entries');
    } else {
      console.error('[loadTimeEntries] API error:', response.error);
      data.timeEntries = [];
    }
  } catch (error) {
    console.error('[loadTimeEntries] Error:', error);
    data.timeEntries = [];
  }
}

// Attach time entry handlers
function attachTimeEntryHandlers() {
  // Add time entry button
  document.querySelectorAll('[data-add-time-entry]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const locationId = btn.getAttribute('data-add-time-entry');
      const date = btn.getAttribute('data-date');
      const dayName = btn.getAttribute('data-day-name');
      openTimeEntryModal(locationId, date, dayName);
    });
  });
  
  // Delete time entry button
  document.querySelectorAll('[data-delete-entry]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entryId = btn.getAttribute('data-delete-entry');
      deleteTimeEntry(entryId);
    });
  });
  
  // Edit time entry (click on entry item)
  document.querySelectorAll('.time-entry-item[data-entry-id]').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't open modal if clicking delete button
      if (e.target.closest('.time-entry__delete')) return;
      
      const entryId = item.getAttribute('data-entry-id');
      const entry = data.timeEntries.find(e => e.id == entryId);
      if (entry) {
        const date = entry.entry_date;
        const locationId = entry.location_id;
        const dayName = getDayName(new Date(date));
        openTimeEntryModal(locationId, date, dayName, entryId);
      }
    });
  });
  
  // Modal close/cancel buttons
  const closeBtn = document.getElementById('time-entry-modal-close');
  const cancelBtn = document.getElementById('time-entry-modal-cancel');
  const overlay = document.getElementById('time-entry-modal-overlay');
  
  if (closeBtn) closeBtn.addEventListener('click', closeTimeEntryModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeTimeEntryModal);
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeTimeEntryModal();
    });
  }
  
  // Save button
  const saveBtn = document.getElementById('time-entry-modal-save');
  if (saveBtn) saveBtn.addEventListener('click', saveTimeEntry);
  
  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && timeEntryState.isModalOpen) {
      closeTimeEntryModal();
    }
  });
}

// ============================================
// Time Entry Wizard Functions
// ============================================

const timeEntryWizardState = {
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
};

function openTimeEntryWizard(suggestedDate = null, suggestedStartTime = null, suggestedEndTime = null) {
  const selectedDate = suggestedDate || uiState.selectedDay || uiState.calendarDate || new Date();
  const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
  date.setHours(0, 0, 0, 0);
  
  timeEntryWizardState.isOpen = true;
  timeEntryWizardState.step = 1;
  timeEntryWizardState.date = date.toISOString().split('T')[0];
  timeEntryWizardState.startTime = suggestedStartTime || '08:00';
  timeEntryWizardState.endTime = suggestedEndTime || '12:00';
  timeEntryWizardState.locationId = null;
  timeEntryWizardState.category = 'BUERO_ALLGEMEIN';
  timeEntryWizardState.categoryType = 'standard';
  timeEntryWizardState.selectedProjectId = null;
  timeEntryWizardState.notes = '';
  timeEntryWizardState.replaceExisting = false;
  const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
  timeEntryWizardState.selectedUserId = isAdmin ? data.currentUser.id : null;
  
  renderApp();
  attachTimeEntryWizardHandlers();
}

function closeTimeEntryWizard() {
  timeEntryWizardState.isOpen = false;
  timeEntryWizardState.step = 1;
  renderApp();
}

// Helper functions for Time Entry Wizard
function getTimeEntryWizardData() {
  const date = new Date(timeEntryWizardState.date + 'T00:00:00');
  const dateDisplay = date.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Generate time options (15-minute intervals)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      timeOptions.push(timeStr);
    }
  }
  
  const standardCategories = [
    { value: 'BUERO_ALLGEMEIN', label: 'Büro allgemein', type: 'standard' },
    { value: 'ENTWICKLUNG', label: 'Entwicklung', type: 'standard' },
    { value: 'MEETING', label: 'Meeting', type: 'standard' },
    { value: 'KRANKHEIT', label: 'Krankheit', type: 'standard' },
    { value: 'TRAINING', label: 'Training', type: 'standard' },
    { value: 'PAUSE', label: 'Pause', type: 'standard' }
  ];
  
  const locations = data.locations || [];
  
  // Generate project categories from locations
  const projectCategories = locations.map((loc, index) => {
    const projectNum = String(index + 1).padStart(2, '0');
    const projectLabel = `Projekt ${projectNum} – ${loc.code || '—'} ${loc.address || ''}`.trim();
    return {
      value: `PROJECT_${loc.id}`,
      label: projectLabel,
      type: 'project',
      projectId: loc.id,
      projectCode: loc.code,
      projectAddress: loc.address
    };
  });
  
  // Helper: Check if category requires no project
  const categoriesWithoutProject = ['KRANKHEIT', 'TRAINING', 'PAUSE', 'BUERO_ALLGEMEIN'];
  const requiresProject = (category) => {
    if (!category) return true;
    if (category.startsWith('PROJECT_')) return false;
    return !categoriesWithoutProject.includes(category);
  };
  const currentCategoryRequiresProject = requiresProject(timeEntryWizardState.category);
  
  // Calculate duration
  const duration = calculateDuration(timeEntryWizardState.startTime, timeEntryWizardState.endTime);
  const durationHours = duration / 60;
  const durationDisplay = duration > 0 ? `${durationHours.toFixed(2)}h (${formatDuration(duration)})` : '--:--';
  
  // Check for existing entries on this date
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  const existingEntries = activeWorkerId ? (data.timeEntries || []).filter(entry => 
    entry.worker_id === activeWorkerId && entry.entry_date === timeEntryWizardState.date
  ) : (data.timeEntries || []).filter(entry => 
    entry.user_id === activeUserId && entry.entry_date === timeEntryWizardState.date
  );
  
  const quickDurations = [
    { label: '15 Min', minutes: 15 },
    { label: '30 Min', minutes: 30 },
    { label: '1 Std', minutes: 60 },
    { label: '2 Std', minutes: 120 },
    { label: '4 Std', minutes: 240 },
    { label: '8.5 Std', minutes: 510 }
  ];
  
  return {
    dateDisplay,
    timeOptions,
    standardCategories,
    projectCategories,
    locations,
    currentCategoryRequiresProject,
    durationDisplay,
    existingEntries,
    quickDurations
  };
}

function renderWizardStep1(wizardData) {
  const { timeOptions, durationDisplay, existingEntries, quickDurations } = wizardData;
  const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
  
  return `
    <div class="wizard-step-content">
      ${isAdmin ? `
        <div class="form-group">
          <label class="form-label" for="wizard-user">Mitarbeiter *</label>
          <select class="form-select" id="wizard-user" required>
            <option value="${data.currentUser.id}" ${!timeEntryWizardState.selectedUserId || timeEntryWizardState.selectedUserId === data.currentUser.id ? 'selected' : ''}>${data.currentUser.name} (Ich)</option>
            ${data.users.filter(u => u.id !== data.currentUser.id).map(user => `
              <option value="${user.id}" ${timeEntryWizardState.selectedUserId === user.id ? 'selected' : ''}>${user.name}</option>
            `).join('')}
          </select>
        </div>
      ` : ''}
      <div class="form-group">
        <label class="form-label" for="wizard-date">Datum *</label>
        <input type="date" class="form-input" id="wizard-date" value="${timeEntryWizardState.date}" required />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="wizard-start-time">Startzeit *</label>
          <select class="form-select" id="wizard-start-time" required>
            ${timeOptions.map(time => `
              <option value="${time}" ${time === timeEntryWizardState.startTime ? 'selected' : ''}>${time}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="wizard-end-time">Endzeit *</label>
          <select class="form-select" id="wizard-end-time" required>
            ${timeOptions.map(time => `
              <option value="${time}" ${time === timeEntryWizardState.endTime ? 'selected' : ''}>${time}</option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Schnellauswahl Dauer</label>
        <div class="quick-duration-buttons">
          ${quickDurations.map(dur => `
            <button type="button" class="btn-quick-duration" data-duration="${dur.minutes}">${dur.label}</button>
          `).join('')}
        </div>
      </div>
      
      <div class="wizard-preview">
        <span class="preview-label">Dauer:</span>
        <span class="preview-value" id="wizard-duration">${durationDisplay}</span>
      </div>
      
      ${existingEntries.length > 0 ? `
        <div class="wizard-warning">
          <span class="warning-icon">⚠️</span>
          <span class="warning-text">Dieser Tag hat bereits ${existingEntries.length} Zeiteintrag(e).</span>
        </div>
      ` : ''}
    </div>
  `;
}

// Helper function to render project details box (used in Wizard and elsewhere)
function renderProjectDetailsBox(project, options = {}) {
  if (!project) return '';
  
  const compact = options.compact || false;
  const startDate = project.schedule?.start ? new Date(project.schedule.start).toLocaleDateString('de-DE') : '—';
  const endDate = project.schedule?.end ? new Date(project.schedule.end).toLocaleDateString('de-DE') : '—';
  const deadline = project.deadline ? new Date(project.deadline).toLocaleDateString('de-DE') : '—';
  const progress = project.progress !== undefined && project.progress !== null ? `${project.progress}% abgeschlossen` : '0% abgeschlossen';
  const crew = project.crew && project.crew.length > 0 ? project.crew.map(m => m.name || m).join(', ') : 'Noch keine Crew zugewiesen';
  const status = project.status || 'Geplant';
  const shortcut = project.shortcut || project.code?.substring(0, 3) || '—';
  
  const vehicleIcons = {
    'LKW': '🚚',
    'Transporter': '🚐',
    'Bagger': '🚜',
    'Schleifmaschine': '⚙️',
    'Gerüst': '🪜'
  };
  
  const vehiclesDisplay = project.vehicles && project.vehicles.length > 0
    ? project.vehicles.map(v => {
        const icon = vehicleIcons[v] || '🚛';
        return `${icon} ${v}`;
      }).join(', ')
    : '—';
  
  return `
    <div class="wizard-project-details">
      <h4 class="wizard-project-details__title">Projekt-Details</h4>
      <div class="wizard-project-details__content">
        <div class="project-details__row">
          <span class="project-details__label">Projektcode:</span>
          <span class="project-details__value">${project.code || '—'}</span>
        </div>
        <div class="project-details__row">
          <span class="project-details__label">📍 Einsatzort:</span>
          <span class="project-details__value">${project.address || '—'}</span>
        </div>
        ${project.start_address ? `
          <div class="project-details__row">
            <span class="project-details__label">Startadresse:</span>
            <span class="project-details__value">${project.start_address}</span>
          </div>
        ` : ''}
        <div class="project-details__row">
          <span class="project-details__label">Fahrzeuge/Maschinen:</span>
          <span class="project-details__value">${vehiclesDisplay}</span>
        </div>
        ${project.safety_briefing ? `
          <div class="project-details__row">
            <span class="project-details__label">⚠️ Sicherheitsbriefing:</span>
            <span class="project-details__value">${project.safety_briefing}</span>
          </div>
        ` : ''}
        <div class="project-details__row">
          <span class="project-details__label">Crew:</span>
          <span class="project-details__value">${crew}</span>
        </div>
        <div class="project-details__row">
          <span class="project-details__label">Status:</span>
          <span class="project-details__value">${status}</span>
        </div>
        <div class="project-details__row">
          <span class="project-details__label">Deadline:</span>
          <span class="project-details__value">${deadline}</span>
        </div>
        <div class="project-details__row">
          <span class="project-details__label">Start:</span>
          <span class="project-details__value">${startDate}</span>
        </div>
        <div class="project-details__row">
          <span class="project-details__label">Ende:</span>
          <span class="project-details__value">${endDate}</span>
        </div>
        <div class="project-details__row">
          <span class="project-details__label">Fortschritt:</span>
          <span class="project-details__value">${progress}</span>
        </div>
        <div class="project-details__row">
          <span class="project-details__label">Kürzel:</span>
          <span class="project-details__value">${shortcut}</span>
        </div>
        ${project.team_leader_name ? `
          <div class="project-details__row">
            <span class="project-details__label">Leiter:</span>
            <span class="project-details__value">${project.team_leader_name}</span>
          </div>
        ` : ''}
        ${project.team_leader_phone ? `
          <div class="project-details__row">
            <span class="project-details__label">Telefon:</span>
            <span class="project-details__value"><a href="tel:${project.team_leader_phone}">${project.team_leader_phone}</a></span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderWizardStep2(wizardData) {
  const { standardCategories, projectCategories, currentCategoryRequiresProject } = wizardData;
  
  // Get selected project if project category is chosen
  const selectedProjectId = timeEntryWizardState.selectedProjectId;
  const selectedProject = selectedProjectId ? (data.locations || []).find(loc => loc.id === selectedProjectId) : null;
  
  return `
    <div class="wizard-step-content">
      <div class="form-group">
        <label class="form-label" for="wizard-category">Kategorie *</label>
        <select class="form-select" id="wizard-category" required>
          <optgroup label="Kategorien">
            ${standardCategories.map(cat => `
              <option value="${cat.value}" data-category-type="standard" ${timeEntryWizardState.category === cat.value && timeEntryWizardState.categoryType === 'standard' ? 'selected' : ''}>${cat.label}</option>
            `).join('')}
          </optgroup>
          ${projectCategories.length > 0 ? `
            <optgroup label="Projekte">
              ${projectCategories.map(cat => `
                <option value="${cat.value}" data-category-type="project" data-project-id="${cat.projectId}" ${timeEntryWizardState.category === cat.value && timeEntryWizardState.categoryType === 'project' ? 'selected' : ''}>${cat.label}</option>
              `).join('')}
            </optgroup>
          ` : ''}
        </select>
      </div>
      
      ${timeEntryWizardState.categoryType === 'project' && selectedProject ? renderProjectDetailsBox(selectedProject) : ''}
      
      ${timeEntryWizardState.categoryType === 'project' ? `
        <div class="wizard-info">
          <span class="info-icon">ℹ️</span>
          <span class="info-text">Projekt wurde automatisch zugewiesen. Schritt 3 wird übersprungen.</span>
        </div>
      ` : ''}
      
      ${!currentCategoryRequiresProject ? `
        <div class="wizard-info">
          <span class="info-icon">ℹ️</span>
          <span class="info-text">Diese Kategorie benötigt kein Projekt. Schritt 3 wird übersprungen.</span>
        </div>
      ` : ''}
      
      ${timeEntryWizardState.category === 'KRANKHEIT' && timeEntryWizardState.categoryType === 'standard' ? `
        <div class="wizard-info">
          <span class="info-icon">ℹ️</span>
          <span class="info-text">Standard: 8.5h (08:00–16:30) wird vorgeschlagen, kann aber angepasst werden.</span>
        </div>
      ` : ''}
    </div>
  `;
}

function renderWizardStep3(wizardData) {
  const { dateDisplay, durationDisplay, standardCategories, projectCategories, locations, currentCategoryRequiresProject, existingEntries } = wizardData;
  
  return `
    <div class="wizard-step-content">
      ${timeEntryWizardState.categoryType === 'project' || !currentCategoryRequiresProject ? '' : `
        <div class="form-group">
          <label class="form-label" for="wizard-location">Projekt/Baustelle *</label>
          <select class="form-select" id="wizard-location" required>
            <option value="">-- Bitte auswählen --</option>
            ${locations.map(loc => `
              <option value="${loc.id}" ${timeEntryWizardState.locationId === loc.id ? 'selected' : ''}>
                ${loc.code || '—'} - ${loc.address || '—'}
              </option>
            `).join('')}
          </select>
        </div>
        
        ${locations.length === 0 ? `
          <div class="wizard-info">
            <span class="info-icon">ℹ️</span>
            <span class="info-text">Keine Baustellen vorhanden. Bitte zuerst eine Baustelle anlegen.</span>
          </div>
        ` : ''}
      `}
      
      <div class="form-group">
        <label class="form-label" for="wizard-notes">Notiz (optional)</label>
        <textarea class="form-textarea" id="wizard-notes" rows="3" placeholder="Zusätzliche Informationen...">${timeEntryWizardState.notes}</textarea>
      </div>
      
      ${timeEntryWizardState.category === 'KRANKHEIT' && timeEntryWizardState.categoryType === 'standard' && existingEntries.length > 0 ? `
        <div class="form-group">
          <label class="form-checkbox-label">
            <input type="checkbox" id="wizard-replace-existing" ${timeEntryWizardState.replaceExisting ? 'checked' : ''} />
            <span>Bestehende Einträge ersetzen (Ganzer Tag 8.5h)</span>
          </label>
        </div>
      ` : ''}
      
      <div class="wizard-summary">
        <div class="summary-row">
          <span class="summary-label">Datum:</span>
          <span class="summary-value">${dateDisplay}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Zeit:</span>
          <span class="summary-value">${timeEntryWizardState.startTime}–${timeEntryWizardState.endTime}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Dauer:</span>
          <span class="summary-value">${durationDisplay}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Kategorie:</span>
          <span class="summary-value">${(() => {
            if (timeEntryWizardState.categoryType === 'project') {
              const selectedProject = projectCategories.find(cat => cat.value === timeEntryWizardState.category);
              return selectedProject ? selectedProject.label : 'Projekt';
            } else {
              const selectedCat = standardCategories.find(cat => cat.value === timeEntryWizardState.category);
              return selectedCat ? selectedCat.label : timeEntryWizardState.category;
            }
          })()}</span>
        </div>
        ${timeEntryWizardState.locationId || timeEntryWizardState.selectedProjectId ? (() => {
          const locId = timeEntryWizardState.selectedProjectId || timeEntryWizardState.locationId;
          const loc = locations.find(l => l.id === locId);
          if (!loc) return '';
          
          return `
            <div class="summary-row">
              <span class="summary-label">Projekt:</span>
              <span class="summary-value">${loc.code || '—'} - ${loc.address || '—'}</span>
            </div>
            ${renderProjectDetailsBox(loc)}
          `;
        })() : ''}
      </div>
    </div>
  `;
}

function renderEmployeeCalendarModal() {
  if (!uiState.isEmployeeCalendarModalOpen) return '';
  const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
  if (!isAdmin) return '';

  const allUsers = data.users.filter(u => u.workerId); // Only users with a workerId
  const currentViewUserId = uiState.calendarViewUserId || data.currentUser.id;

  return `
    <div class="modal-overlay" data-action="close-employee-calendar-modal">
      <div class="modal-content" data-modal-name="employee-calendar-select">
        <h3>Kalender anzeigen für:</h3>
        <div class="form-group">
          <label class="form-label" for="employee-calendar-select">Mitarbeiter:</label>
          <select class="form-select" id="employee-calendar-select">
            <option value="${data.currentUser.id}" ${currentViewUserId === data.currentUser.id ? 'selected' : ''}>${data.currentUser.name} (Ich)</option>
            ${allUsers.filter(u => u.id !== data.currentUser.id).map(user => `
              <option value="${user.id}" ${currentViewUserId === user.id ? 'selected' : ''}>${user.name}</option>
            `).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" data-action="close-employee-calendar-modal">Abbrechen</button>
          <button class="btn-primary" data-action="apply-employee-calendar-view">Anzeigen</button>
        </div>
      </div>
    </div>
  `;
}

function showEmployeeCalendarModal() {
  uiState.isEmployeeCalendarModalOpen = true;
  renderApp();
}

function closeEmployeeCalendarModal() {
  uiState.isEmployeeCalendarModalOpen = false;
  renderApp();
}

function renderTimeEntryWizard() {
  if (!timeEntryWizardState.isOpen) return '';
  
  const wizardData = getTimeEntryWizardData();
  const { currentCategoryRequiresProject } = wizardData;
  
  return `
    <div class="time-entry-wizard-overlay" id="time-entry-wizard-overlay">
      <div class="time-entry-wizard" id="time-entry-wizard">
        <div class="time-entry-wizard__header">
          <h3 class="time-entry-wizard__title">Zeit erfassen</h3>
          <button class="time-entry-wizard__close" data-action="timeentry-cancel" title="Schließen">✕</button>
        </div>
        
        <div class="time-entry-wizard__steps">
          <div class="wizard-step ${timeEntryWizardState.step >= 1 ? 'active' : ''} ${timeEntryWizardState.step > 1 ? 'completed' : ''}">
            <div class="wizard-step__number">1</div>
            <div class="wizard-step__label">Datum & Zeit</div>
          </div>
          <div class="wizard-step ${timeEntryWizardState.step >= 2 ? 'active' : ''} ${timeEntryWizardState.step > 2 ? 'completed' : ''}">
            <div class="wizard-step__number">2</div>
            <div class="wizard-step__label">Kategorie</div>
          </div>
          <div class="wizard-step ${timeEntryWizardState.step >= 3 ? 'active' : ''} ${!currentCategoryRequiresProject || timeEntryWizardState.categoryType === 'project' ? 'wizard-step--skipped' : ''}">
            <div class="wizard-step__number">3</div>
            <div class="wizard-step__label">Projekt</div>
          </div>
        </div>
        
        <div class="time-entry-wizard__body">
          ${timeEntryWizardState.step === 1 ? renderWizardStep1(wizardData) : ''}
          ${timeEntryWizardState.step === 2 ? renderWizardStep2(wizardData) : ''}
          ${timeEntryWizardState.step === 3 ? renderWizardStep3(wizardData) : ''}
        </div>
        
        <div class="time-entry-wizard__footer">
          ${timeEntryWizardState.step > 1 ? `
            <button class="btn-secondary" data-action="timeentry-prev">Zurück</button>
          ` : ''}
          <button class="btn-secondary" data-action="timeentry-cancel">Abbrechen</button>
          ${timeEntryWizardState.step < 3 || (timeEntryWizardState.step === 3 && (timeEntryWizardState.categoryType === 'project' || !currentCategoryRequiresProject)) ? `
            <button class="btn-primary" data-action="timeentry-next">${timeEntryWizardState.step === 3 && (timeEntryWizardState.categoryType === 'project' || !currentCategoryRequiresProject) ? 'Speichern' : timeEntryWizardState.step === 2 && !currentCategoryRequiresProject ? 'Speichern' : 'Weiter'}</button>
          ` : `
            <button class="btn-primary" data-action="timeentry-save">Speichern</button>
          `}
        </div>
      </div>
    </div>
  `;
}

// Helper function to clone and replace element (removes old event listeners)
function cloneAndReplaceElement(element, handler) {
  if (!element) return null;
  const newElement = element.cloneNode(true);
  if (element.parentNode) {
    element.parentNode.replaceChild(newElement, element);
  }
  if (handler) {
    newElement.addEventListener('click', handler);
  }
  return newElement;
}

// Wizard Handler Functions
function attachWizardNavigationHandlers() {
  const closeBtn = document.getElementById('time-entry-wizard-close');
  const cancelBtn = document.getElementById('wizard-cancel');
  const overlay = document.getElementById('time-entry-wizard-overlay');
  const prevBtn = document.getElementById('wizard-prev');
  
  const closeHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeTimeEntryWizard();
  };
  
  if (closeBtn) cloneAndReplaceElement(closeBtn, closeHandler);
  if (cancelBtn) cloneAndReplaceElement(cancelBtn, closeHandler);
  if (overlay) {
    const newOverlay = cloneAndReplaceElement(overlay);
    if (newOverlay) {
      newOverlay.addEventListener('click', (e) => {
        if (e.target === newOverlay) closeTimeEntryWizard();
      });
    }
  }
  
  if (prevBtn) {
    cloneAndReplaceElement(prevBtn, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (timeEntryWizardState.step > 1) {
        timeEntryWizardState.step--;
        renderApp();
      }
    });
  }
}

function attachWizardStep1Handlers(updateWizardDuration) {
  // Quick duration buttons
  document.querySelectorAll('.btn-quick-duration').forEach((btn) => {
    cloneAndReplaceElement(btn, (e) => {
      e.preventDefault();
      e.stopPropagation();
      const minutes = parseInt(btn.getAttribute('data-duration'));
      const startTime = timeEntryWizardState.startTime || '08:00';
      const [startHour, startMin] = startTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = startMinutes + minutes;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      
      timeEntryWizardState.endTime = endTime;
      const endTimeEl = document.getElementById('wizard-end-time');
      if (endTimeEl) endTimeEl.value = endTime;
      renderApp();
    });
  });
  
  // Duration update on time change
  const startSelect = document.getElementById('wizard-start-time');
  const endSelect = document.getElementById('wizard-end-time');
  const dateInput = document.getElementById('wizard-date');
  
  if (startSelect) {
    const newStartSelect = cloneAndReplaceElement(startSelect);
    if (newStartSelect) newStartSelect.addEventListener('change', updateWizardDuration);
  }
  
  if (endSelect) {
    const newEndSelect = cloneAndReplaceElement(endSelect);
    if (newEndSelect) newEndSelect.addEventListener('change', updateWizardDuration);
  }
  
  if (dateInput) {
    // Don't clone date input - user needs to be able to change it
    // Directly attach change handler to avoid losing focus/value
    const existingHandler = dateInput.getAttribute('data-date-handler-attached');
    if (!existingHandler) {
      dateInput.addEventListener('change', (e) => {
        const newDate = e.target.value;
        if (newDate && newDate !== timeEntryWizardState.date) {
          timeEntryWizardState.date = newDate;
          // Update existing entries check for new date without full re-render
          // Just update duration display and warning if needed
          const updateWizardDuration = () => {
            const startSelect = document.getElementById('wizard-start-time');
            const endSelect = document.getElementById('wizard-end-time');
            const start = startSelect?.value;
            const end = endSelect?.value;
            if (start && end) {
              const duration = calculateDuration(start, end);
              const durationHours = duration / 60;
              const durationDisplay = duration > 0 ? `${durationHours.toFixed(2)}h (${formatDuration(duration)})` : '--:--';
              const durationEl = document.getElementById('wizard-duration');
              if (durationEl) durationEl.textContent = durationDisplay;
            }
          };
          updateWizardDuration();
          // Re-render only the warning section for existing entries on new date
          renderApp();
        }
      });
      dateInput.setAttribute('data-date-handler-attached', 'true');
    }
  }
}

function attachWizardStep2Handlers(updateWizardDuration) {
  const categorySelect = document.getElementById('wizard-category');
  if (!categorySelect) return;
  
  const newCategorySelect = cloneAndReplaceElement(categorySelect);
  if (!newCategorySelect) return;
  
  newCategorySelect.addEventListener('change', (e) => {
    const selectedOption = newCategorySelect.options[newCategorySelect.selectedIndex];
    const categoryValue = e.target.value;
    const categoryType = selectedOption?.getAttribute('data-category-type');
    const projectId = selectedOption?.getAttribute('data-project-id');
    
    timeEntryWizardState.category = categoryValue;
    timeEntryWizardState.categoryType = categoryType || 'standard';
    
    if (categoryType === 'project') {
      timeEntryWizardState.selectedProjectId = projectId;
      timeEntryWizardState.locationId = projectId;
    } else {
      timeEntryWizardState.selectedProjectId = null;
      timeEntryWizardState.locationId = null;
      
      // Auto-suggest 8.5h for sickness
      if (categoryValue === 'KRANKHEIT') {
        const workHours = getDefaultWorkHours();
        if (timeEntryWizardState.startTime === '08:00' && timeEntryWizardState.endTime === '12:00') {
          timeEntryWizardState.startTime = workHours.workday_start;
          timeEntryWizardState.endTime = workHours.workday_end;
          const startSelectEl = document.getElementById('wizard-start-time');
          const endSelectEl = document.getElementById('wizard-end-time');
          if (startSelectEl) startSelectEl.value = workHours.workday_start;
          if (endSelectEl) endSelectEl.value = workHours.workday_end;
          updateWizardDuration();
        }
      }
    }
    
    renderApp();
  });
}

function attachWizardStep3Handlers() {
  // Save button handler is attached in attachWizardNextButtonHandler
}

function attachWizardNextButtonHandler() {
  const nextBtn = document.getElementById('wizard-next');
  if (!nextBtn) {
    console.warn('[Wizard] Next button not found!');
    return;
  }
  
  const newNextBtn = cloneAndReplaceElement(nextBtn);
  if (!newNextBtn) return;
  
  newNextBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (timeEntryWizardState.step === 1) {
      // Validate step 1
      const dateEl = document.getElementById('wizard-date');
      const startTimeEl = document.getElementById('wizard-start-time');
      const endTimeEl = document.getElementById('wizard-end-time');
      
      const date = dateEl?.value;
      const startTime = startTimeEl?.value;
      const endTime = endTimeEl?.value;
      
      if (!date || !startTime || !endTime) {
        alert('Bitte füllen Sie alle Felder aus.');
        return;
      }
      
      if (startTime >= endTime) {
        alert('Endzeit muss nach Startzeit liegen.');
        return;
      }
      
      timeEntryWizardState.date = date;
      timeEntryWizardState.startTime = startTime;
      timeEntryWizardState.endTime = endTime;
      timeEntryWizardState.step = 2;
      renderApp();
    } else if (timeEntryWizardState.step === 2) {
      // Validate step 2
      const categorySelect = document.getElementById('wizard-category');
      const selectedOption = categorySelect?.options[categorySelect.selectedIndex];
      const categoryValue = categorySelect?.value;
      const categoryType = selectedOption?.getAttribute('data-category-type');
      
      if (!categoryValue) {
        alert('Bitte wählen Sie eine Kategorie aus.');
        return;
      }
      
      timeEntryWizardState.category = categoryValue;
      timeEntryWizardState.categoryType = categoryType || 'standard';
      
      const categoriesWithoutProject = ['KRANKHEIT', 'TRAINING', 'PAUSE', 'BUERO_ALLGEMEIN'];
      const requiresProject = !categoryValue.startsWith('PROJECT_') && !categoriesWithoutProject.includes(categoryValue);
      
      if (categoryType === 'project') {
        const projectId = selectedOption?.getAttribute('data-project-id');
        timeEntryWizardState.selectedProjectId = projectId;
        timeEntryWizardState.locationId = projectId;
        timeEntryWizardState.step = 3;
        renderApp();
      } else if (!requiresProject) {
        if (categoryValue === 'KRANKHEIT') {
          const workHours = getDefaultWorkHours();
          if (timeEntryWizardState.startTime === '08:00' && timeEntryWizardState.endTime === '12:00') {
            timeEntryWizardState.startTime = workHours.workday_start;
            timeEntryWizardState.endTime = workHours.workday_end;
          }
        }
        timeEntryWizardState.step = 3;
        renderApp();
      } else {
        if (categoryValue === 'KRANKHEIT') {
          const workHours = getDefaultWorkHours();
          if (timeEntryWizardState.startTime === '08:00' && timeEntryWizardState.endTime === '12:00') {
            timeEntryWizardState.startTime = workHours.workday_start;
            timeEntryWizardState.endTime = workHours.workday_end;
          }
        }
        timeEntryWizardState.step = 3;
        renderApp();
      }
    } else if (timeEntryWizardState.step === 3) {
      // Step 3 - save directly if no project required
      const categoriesWithoutProject = ['KRANKHEIT', 'TRAINING', 'PAUSE', 'BUERO_ALLGEMEIN'];
      const requiresProject = !timeEntryWizardState.category.startsWith('PROJECT_') && !categoriesWithoutProject.includes(timeEntryWizardState.category);
      
      if (timeEntryWizardState.categoryType === 'project' || !requiresProject) {
        const notes = document.getElementById('wizard-notes')?.value || '';
        timeEntryWizardState.notes = notes;
        await saveTimeEntryFromWizard(false);
      }
    }
  });
}

function attachWizardSaveButtonHandler() {
  const saveBtn = document.getElementById('wizard-save');
  if (!saveBtn) return;
  
  const newSaveBtn = cloneAndReplaceElement(saveBtn);
  if (!newSaveBtn) return;
  
  newSaveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const categoriesWithoutProject = ['KRANKHEIT', 'TRAINING', 'PAUSE', 'BUERO_ALLGEMEIN'];
    const requiresProject = !timeEntryWizardState.category.startsWith('PROJECT_') && !categoriesWithoutProject.includes(timeEntryWizardState.category);
    
    if (timeEntryWizardState.categoryType === 'standard' && requiresProject) {
      const locationId = document.getElementById('wizard-location')?.value;
      if (!locationId) {
        alert('Bitte wählen Sie eine Baustelle aus.');
        return;
      }
      timeEntryWizardState.locationId = locationId;
    } else if (timeEntryWizardState.categoryType === 'standard' && timeEntryWizardState.category === 'BUERO_ALLGEMEIN') {
      const locationId = document.getElementById('wizard-location')?.value;
      timeEntryWizardState.locationId = locationId || null;
    }
    
    const notes = document.getElementById('wizard-notes')?.value || '';
    timeEntryWizardState.notes = notes;
    const replaceExisting = document.getElementById('wizard-replace-existing')?.checked || false;
    
    await saveTimeEntryFromWizard(replaceExisting);
  });
}

function attachTimeEntryWizardHandlers() {
  setTimeout(() => {
    const overlay = document.getElementById('time-entry-wizard-overlay');
    if (!overlay) {
      console.log('[Wizard] Overlay not found, handlers not attached');
      return;
    }
    
    console.log('[Wizard] Attaching handlers, step:', timeEntryWizardState.step);
    
    // Helper function to update duration display
    const updateWizardDuration = () => {
      const startSelect = document.getElementById('wizard-start-time');
      const endSelect = document.getElementById('wizard-end-time');
      const start = startSelect?.value;
      const end = endSelect?.value;
      if (start && end) {
        const duration = calculateDuration(start, end);
        const durationHours = duration / 60;
        const durationDisplay = duration > 0 ? `${durationHours.toFixed(2)}h (${formatDuration(duration)})` : '--:--';
        const durationEl = document.getElementById('wizard-duration');
        if (durationEl) durationEl.textContent = durationDisplay;
      }
    };
    
    // Attach all handlers
    attachWizardNavigationHandlers();
    attachWizardNextButtonHandler();
    attachWizardSaveButtonHandler();
    
    // Attach step-specific handlers
    if (timeEntryWizardState.step === 1) {
      attachWizardStep1Handlers(updateWizardDuration);
    } else if (timeEntryWizardState.step === 2) {
      attachWizardStep2Handlers(updateWizardDuration);
    } else if (timeEntryWizardState.step === 3) {
      attachWizardStep3Handlers();
    }
    
    console.log('[Wizard] Handlers attached successfully');
  }, 0);
}

async function saveTimeEntryFromWizard(replaceExisting = false) {
  // Get selected user from wizard (admin can select other users)
  const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
  const wizardUserId = document.getElementById('wizard-user')?.value;
  const selectedUserId = (isAdmin && wizardUserId) ? wizardUserId : data.currentUser?.id;
  const selectedUser = selectedUserId ? data.users.find(u => u.id === selectedUserId) : null;
  const activeWorkerId = selectedUser?.workerId || null;
  const activeUserId = selectedUserId || null;
  
  if (!activeWorkerId && !activeUserId) {
    alert('Kein Mitarbeiter oder User zugeordnet');
    return;
  }
  
  const saveBtn = document.getElementById('wizard-save');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Speichere...';
  }
  
  try {
    // Check for overlaps
    const validation = validateTimeEntry(activeWorkerId || activeUserId, timeEntryWizardState.date, timeEntryWizardState.startTime, timeEntryWizardState.endTime, null);
    if (!validation.valid && !replaceExisting) {
      alert(validation.error);
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Speichern';
      }
      return;
    }
    
    // Replace existing entries if requested
    if (replaceExisting) {
      const existingEntries = (data.timeEntries || []).filter(entry => {
        if (activeWorkerId) {
          return entry.worker_id === activeWorkerId && entry.entry_date === timeEntryWizardState.date;
        } else {
          return entry.user_id === activeUserId && entry.entry_date === timeEntryWizardState.date;
        }
      });
      
      for (const entry of existingEntries) {
        await api.deleteTimeEntry(entry.id);
      }
    }
    
    // Determine final category and location
    let finalCategory = timeEntryWizardState.category;
    let finalLocationId = timeEntryWizardState.locationId || timeEntryWizardState.selectedProjectId;
    
    // Check if category requires project (BUERO_ALLGEMEIN is optional)
    const categoriesWithoutProject = ['KRANKHEIT', 'TRAINING', 'PAUSE', 'BUERO_ALLGEMEIN'];
    const requiresProject = !timeEntryWizardState.category.startsWith('PROJECT_') && !categoriesWithoutProject.includes(timeEntryWizardState.category);
    
    // If project category was selected, save PROJECT_XXX format directly
    // This allows us to parse it later for display
    if (timeEntryWizardState.categoryType === 'project') {
      // Keep PROJECT_XXX format - backend can store it as-is
      finalCategory = timeEntryWizardState.category; // Already in format PROJECT_XXX
      finalLocationId = timeEntryWizardState.selectedProjectId;
    } else if (!requiresProject) {
      // Categories without required project (KRANKHEIT, TRAINING, PAUSE, BUERO_ALLGEMEIN)
      // For BUERO_ALLGEMEIN, locationId can be set if user selected one (optional)
      if (timeEntryWizardState.category !== 'BUERO_ALLGEMEIN') {
        finalLocationId = null; // No location for KRANKHEIT, TRAINING, PAUSE
      }
      // For BUERO_ALLGEMEIN, keep locationId if it was set (optional)
    }
    
    // Determine status: Admin creates PLANNED entries for planning
    const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
    const status = isAdmin ? 'PLANNED' : 'PLANNED'; // Default to PLANNED (workers confirm via separate action)
    
    // PHASE 5: SINGLE SOURCE OF TRUTH - date from state, never fallback
    const entryDate = timeEntryWizardState.date || workflowState.selectedDate || new Date().toISOString().split('T')[0];
    
    const entryData = {
      entry_date: entryDate, // PHASE 5: Always use state.date
      time_from: timeEntryWizardState.startTime,
      time_to: timeEntryWizardState.endTime,
      category: finalCategory,
      notes: timeEntryWizardState.notes || '',
      status: status
    };
    
    // Set worker_id or user_id based on what's available
    if (activeWorkerId) {
      entryData.worker_id = activeWorkerId;
    } else if (activeUserId) {
      entryData.user_id = activeUserId;
    }
    
    // Set location_id only if required
    if (finalLocationId) {
      entryData.location_id = finalLocationId;
    }
  
    const response = await api.createTimeEntry(entryData);
    
    if (response.success) {
      // PHASE 5: Set selectedDate to saved date and reload
      workflowState.selectedDate = entryDate;
      
      // Reload day entries for saved date
      await loadDayEntries(entryDate);
      
      // Calculate week start for reload
      const weekStart = new Date(entryDate + 'T00:00:00');
      const dayOfWeek = weekStart.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysFromMonday);
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      await loadWeekEntries(weekStartStr);
      
      // Update selected date and switch to day view
      const entryDateObj = new Date(entryDate + 'T00:00:00');
      uiState.selectedDay = entryDateObj;
      uiState.calendarDate = entryDateObj;
      uiState.calendarViewMode = 'day';
      
      closeTimeEntryWizard();
      renderApp();
    } else {
      alert(`Fehler beim Speichern: ${response.error || 'Unbekannter Fehler'}`);
    }
  } catch (error) {
    console.error('Error saving time entry:', error);
    alert(`Fehler beim Speichern: ${error.message}`);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Speichern';
    }
  }
}

// Initialize: Load data and render app
async function initializeApp() {
  // First, check if user has active session
  const hasSession = await checkCurrentSession();
  
  if (hasSession) {
    // User is logged in, load all data
    await loadAllData();
  }
  
  // Render app (will show login if not authenticated)
  renderApp();
}

// Replace renderApp call with initializeApp
// initial render
initializeApp();