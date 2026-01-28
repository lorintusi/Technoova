/**
 * Formatting utilities
 */

/**
 * Get day name in German
 * @param {Date} date - Date object
 * @returns {string} Day name
 */
export function getDayName(date) {
  const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  return dayNames[date.getDay()];
}

/**
 * Format date for display (e.g. "14. November 2025")
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDateForDisplay(date) {
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  return `${date.getDate()}. ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format date (robust, accepts Date objects and strings)
 * @param {Date|string} value - Date to format
 * @returns {string} Formatted date or "—"
 */
export function formatDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Format date and time
 * @param {Date|string} value - Date to format
 * @returns {string} Formatted date/time or "—"
 */
export function formatDateTime(value) {
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

/**
 * Format duration as hours:minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g. "2:30")
 */
export function formatDuration(minutes) {
  if (!minutes) return '0:00';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
}

/**
 * Format today date
 * @param {Date} date - Date object
 * @returns {string} Formatted today string
 */
export function formatTodayDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  if (targetDate.getTime() === today.getTime()) {
    return "Heute";
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (targetDate.getTime() === yesterday.getTime()) {
    return "Gestern";
  }
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (targetDate.getTime() === tomorrow.getTime()) {
    return "Morgen";
  }
  
  return formatDateForDisplay(date);
}

/**
 * Format last login date
 * @param {string} lastLoginString - Last login string
 * @returns {string} Formatted last login
 */
export function formatLastLogin(lastLoginString) {
  if (!lastLoginString) return "Nie";
  
  try {
    // Try to parse as ISO date
    const date = new Date(lastLoginString);
    if (!isNaN(date.getTime())) {
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Heute";
      if (diffDays === 1) return "Gestern";
      if (diffDays < 7) return `vor ${diffDays} Tagen`;
      if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`;
      return formatDate(date);
    }
    
    // If already formatted, return as-is
    return lastLoginString;
  } catch (e) {
    return lastLoginString || "Nie";
  }
}

/**
 * Slugify status string
 * @param {string} status - Status string
 * @returns {string} Slugified status
 */
export function slugifyStatus(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");
}

/**
 * Get status label in German
 * @param {string} status - Status code
 * @returns {string} German label
 */
export function getStatusLabel(status) {
  const statusLabels = {
    'PLANNED': 'Geplant',
    'CONFIRMED': 'Bestätigt',
    'REJECTED': 'Abgelehnt'
  };
  return statusLabels[status] || status || 'Geplant';
}

/**
 * Get CSS class for status
 * @param {string} status - Status code
 * @returns {string} CSS class name
 */
export function getStatusClass(status) {
  return `status-badge--${slugifyStatus(status || 'PLANNED')}`;
}

/**
 * Convert value to input datetime-local format
 * @param {Date|string} value - Date to convert
 * @returns {string} Input datetime-local format
 */
export function toInputDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert value to input date format
 * @param {Date|string} value - Date to convert
 * @returns {string} Input date format (YYYY-MM-DD)
 */
export function toInputDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format date for local storage/API (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDateLocal(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

