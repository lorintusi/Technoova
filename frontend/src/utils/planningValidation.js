/**
 * Planning Validation Utilities
 * Checks for overlaps and conflicts in planning entries
 */

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Check if two time ranges overlap
 * @param {string} start1 - Start time (HH:MM)
 * @param {string} end1 - End time (HH:MM)
 * @param {string} start2 - Start time (HH:MM)
 * @param {string} end2 - End time (HH:MM)
 * @returns {boolean} True if ranges overlap
 */
function timeRangesOverlap(start1, end1, start2, end2) {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);
  
  // Check for overlap: start1 < end2 && start2 < end1
  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Format time for display
 */
function formatTime(timeStr) {
  if (!timeStr) return '—';
  return timeStr.substring(0, 5); // HH:MM
}

/**
 * Format entry description for error message
 */
function formatEntryDescription(entry) {
  const category = entry.category || 'Allgemein';
  const location = entry.locationName || entry.locationCode || '';
  const locationPart = location ? ` (${location})` : '';
  
  if (entry.allDay) {
    return `${category}${locationPart} - Ganztägig`;
  }
  
  const start = formatTime(entry.startTime || entry.time_from);
  const end = formatTime(entry.endTime || entry.time_to);
  return `${category}${locationPart} - ${start}–${end}`;
}

/**
 * Validate planning entry for overlaps with existing entries
 * @param {object} entry - New/updated planning entry
 * @param {Array} existingEntries - Existing entries for the same worker and date
 * @param {string|number} excludeEntryId - Entry ID to exclude from check (for updates)
 * @returns {{ok: boolean, message: string|null}}
 */
export function validatePlanningEntryOverlap(entry, existingEntries = [], excludeEntryId = null) {
  if (!entry || !entry.workerId || !entry.date) {
    return { ok: false, message: 'Ungültiger Planungseintrag: workerId und date erforderlich' };
  }
  
  // Filter out excluded entry and entries from different worker/date
  const entriesToCheck = existingEntries.filter(existing => {
    // Exclude the entry being updated
    if (excludeEntryId && existing.id === excludeEntryId) {
      return false;
    }
    
    // Must be same worker and date
    if (existing.workerId !== entry.workerId || existing.date !== entry.date) {
      return false;
    }
    
    // Only check PLANNED entries (confirmed entries don't conflict)
    if (existing.status === 'CONFIRMED') {
      return false;
    }
    
    return true;
  });
  
  // Normalize entry times
  const entryAllDay = entry.allDay || false;
  const entryStartTime = entry.startTime || entry.time_from || null;
  const entryEndTime = entry.endTime || entry.time_to || null;
  
  // If entry is all-day, it conflicts with ANY other entry on that day
  if (entryAllDay) {
    if (entriesToCheck.length > 0) {
      const conflicting = entriesToCheck[0];
      const conflictDesc = formatEntryDescription(conflicting);
      return {
        ok: false,
        message: `Konflikt: Ganztägige Planung kollidiert mit bereits geplantem Block "${conflictDesc}"`
      };
    }
  }
  
  // If entry has no time (shouldn't happen, but check)
  if (!entryStartTime || !entryEndTime) {
    // If it's not all-day but has no time, it's invalid
    if (!entryAllDay) {
      return { ok: false, message: 'Zeitplanung erfordert Start- und Endzeit' };
    }
    // All-day is already handled above
    return { ok: true, message: null };
  }
  
  // Check overlap with each existing entry
  for (const existing of entriesToCheck) {
    const existingAllDay = existing.allDay || false;
    const existingStartTime = existing.startTime || existing.time_from || null;
    const existingEndTime = existing.endTime || existing.time_to || null;
    
    // If existing is all-day, it conflicts with our timed entry
    if (existingAllDay) {
      const conflictDesc = formatEntryDescription(existing);
      return {
        ok: false,
        message: `Konflikt: Zeitplanung kollidiert mit ganztägigem Block "${conflictDesc}"`
      };
    }
    
    // Both are timed - check time overlap
    if (existingStartTime && existingEndTime) {
      if (timeRangesOverlap(entryStartTime, entryEndTime, existingStartTime, existingEndTime)) {
        const conflictDesc = formatEntryDescription(existing);
        const existingStart = formatTime(existingStartTime);
        const existingEnd = formatTime(existingEndTime);
        return {
          ok: false,
          message: `Konflikt: Zeitplanung ${formatTime(entryStartTime)}–${formatTime(entryEndTime)} überschneidet sich mit bereits geplantem Block "${conflictDesc}" (${existingStart}–${existingEnd})`
        };
      }
    }
  }
  
  return { ok: true, message: null };
}

/**
 * Debug helper: Test overlap cases (dev only)
 * Call from console: window.testPlanningOverlap()
 */
export function testPlanningOverlap() {
  console.log('=== Planning Overlap Tests ===');
  
  // Test 1: All-day conflicts with timed
  const test1 = validatePlanningEntryOverlap(
    { workerId: 'w1', date: '2025-01-22', allDay: true },
    [{ workerId: 'w1', date: '2025-01-22', allDay: false, startTime: '08:00', endTime: '12:00', category: 'PROJEKT' }]
  );
  console.log('Test 1 (all-day vs timed):', test1.ok ? 'PASS' : 'FAIL', test1.message);
  
  // Test 2: Timed overlaps timed
  const test2 = validatePlanningEntryOverlap(
    { workerId: 'w1', date: '2025-01-22', allDay: false, startTime: '10:00', endTime: '14:00' },
    [{ workerId: 'w1', date: '2025-01-22', allDay: false, startTime: '08:00', endTime: '12:00', category: 'PROJEKT' }]
  );
  console.log('Test 2 (timed overlap):', test2.ok ? 'PASS' : 'FAIL', test2.message);
  
  // Test 3: No overlap
  const test3 = validatePlanningEntryOverlap(
    { workerId: 'w1', date: '2025-01-22', allDay: false, startTime: '14:00', endTime: '17:00' },
    [{ workerId: 'w1', date: '2025-01-22', allDay: false, startTime: '08:00', endTime: '12:00', category: 'PROJEKT' }]
  );
  console.log('Test 3 (no overlap):', test3.ok ? 'PASS' : 'FAIL', test3.message);
  
  // Test 4: Update excludes self
  const test4 = validatePlanningEntryOverlap(
    { id: 'e1', workerId: 'w1', date: '2025-01-22', allDay: false, startTime: '10:00', endTime: '14:00' },
    [{ id: 'e1', workerId: 'w1', date: '2025-01-22', allDay: false, startTime: '08:00', endTime: '12:00', category: 'PROJEKT' }],
    'e1'
  );
  console.log('Test 4 (update excludes self):', test4.ok ? 'PASS' : 'FAIL', test4.message);
  
  console.log('=== Tests Complete ===');
}

// Export test function globally for console access (dev only)
if (typeof window !== 'undefined') {
  window.testPlanningOverlap = testPlanningOverlap;
}


