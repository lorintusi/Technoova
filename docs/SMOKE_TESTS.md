# Smoke Tests - Manual Test Checklist

## Setup
1. Ensure backend is running (PHP server on port 8080)
2. Ensure database is migrated (including `medical_certificates` table)
3. Login as admin (username: `admin`, password: `010203`)

## 1. Planning Overlap Validation Tests

### Test 1.1: All-Day Conflicts with Timed Entry
**Steps:**
1. Plan worker for date X with timed entry (e.g., 08:00-12:00, PROJEKT)
2. Try to plan same worker for same date X with all-day entry
3. **Expected:** Toast error "Konflikt: Ganztägige Planung kollidiert mit bereits geplantem Block..."
4. **Expected:** Entry is NOT saved

### Test 1.2: Timed Entry Overlaps Timed Entry
**Steps:**
1. Plan worker for date X with entry 08:00-12:00 (PROJEKT)
2. Try to plan same worker for same date X with entry 10:00-14:00 (MEETING)
3. **Expected:** Toast error "Konflikt: Zeitplanung 10:00–14:00 überschneidet sich..."
4. **Expected:** Entry is NOT saved

### Test 1.3: No Overlap (Adjacent Times)
**Steps:**
1. Plan worker for date X with entry 08:00-12:00 (PROJEKT)
2. Plan same worker for same date X with entry 12:00-16:00 (MEETING)
3. **Expected:** Both entries save successfully
4. **Expected:** Both visible in week/day view

### Test 1.4: Update Excludes Self
**Steps:**
1. Plan worker for date X with entry 08:00-12:00 (PROJEKT)
2. Edit that entry, change time to 10:00-14:00
3. **Expected:** Save succeeds (no conflict with self)
4. **Expected:** Entry updated in view

### Test 1.5: Different Workers Don't Conflict
**Steps:**
1. Plan worker A for date X with entry 08:00-12:00
2. Plan worker B for same date X with entry 08:00-12:00
3. **Expected:** Both save successfully
4. **Expected:** No conflict error

## 2. Medical Certificate Tests

### Test 2.1: KRANK Requires Certificate
**Steps:**
1. Create planning entry with category KRANK
2. Don't upload file
3. Try to save
4. **Expected:** Toast error "Bei Kategorie KRANK muss ein Arztzeugnis hochgeladen werden"
5. **Expected:** Entry NOT saved

### Test 2.2: Certificate Upload Success
**Steps:**
1. Create planning entry with category KRANK
2. Upload PDF file (< 10MB)
3. Save
4. **Expected:** Entry saved
5. **Expected:** Certificate visible in Verwaltung → Arztzeugnisse
6. **Expected:** Planning entry shows "Zeugnis vorhanden" badge

### Test 2.3: Certificate Replace
**Steps:**
1. Edit existing KRANK planning entry (with certificate)
2. Upload new PDF file
3. Save
4. **Expected:** Old certificate deleted
5. **Expected:** New certificate saved
6. **Expected:** Only one certificate for this planning entry

### Test 2.4: Certificate Download
**Steps:**
1. Go to Verwaltung → Arztzeugnisse
2. Click download button
3. **Expected:** File downloads
4. **Expected:** File is valid PDF/image

### Test 2.5: Certificate Delete (Admin)
**Steps:**
1. Go to Verwaltung → Arztzeugnisse
2. Click delete button
3. Confirm deletion
4. **Expected:** Certificate removed from list
5. **Expected:** File deleted from server

## 3. Audit Trail Tests

### Test 3.1: Planning Entry Shows Creator
**Steps:**
1. Admin creates planning entry for worker
2. Hover over entry in week/day view
3. **Expected:** Tooltip shows "Geplant von Admin am [date]"

### Test 3.2: Worker Self-Planning Shows Creator
**Steps:**
1. Worker creates own planning entry
2. Hover over entry
3. **Expected:** Tooltip shows "Selbst geplant am [date]"

### Test 3.3: Confirm Creates Time Entry with Meta
**Steps:**
1. Worker confirms planned day
2. Check time entries
3. **Expected:** Time entry has `meta.sourcePlanningEntryId`
4. **Expected:** Time entry has `meta.createdFromPlanningAt`
5. **Expected:** No duplicate time entries on second confirm

## 4. Unconfirmed Days Overview (Admin)

### Test 4.1: Unconfirmed Days Visible
**Steps:**
1. Admin logs in
2. Create planning entries for multiple workers (status PLANNED)
3. Check planning shell for "Unbestätigte Tage" section
4. **Expected:** List shows workers with unconfirmed days
5. **Expected:** Click opens day view for that worker/date

### Test 4.2: Confirmed Days Not Shown
**Steps:**
1. Worker confirms planned day
2. Admin checks unconfirmed overview
3. **Expected:** That day no longer appears in unconfirmed list

## 5. Error & Loading States

### Test 5.1: Loading State During Save
**Steps:**
1. Create planning entry
2. Click save
3. **Expected:** Submit button shows "Speichere..." and is disabled
4. **Expected:** Button re-enables after success/error

### Test 5.2: Backend Error Handling
**Steps:**
1. Stop backend server
2. Try to save planning entry
3. **Expected:** Toast error with clear message
4. **Expected:** UI doesn't crash
5. **Expected:** Form remains usable

### Test 5.3: Network Error Handling
**Steps:**
1. Disconnect network
2. Try to load data
3. **Expected:** Error message shown
4. **Expected:** UI doesn't show empty state without explanation

## 6. Field Normalization Tests

### Test 6.1: Backend Returns snake_case
**Steps:**
1. Create planning entry via API
2. Check response
3. **Expected:** Response has `start_time`, `end_time`, `all_day`, `worker_id`
4. **Expected:** Frontend normalizes to `startTime`, `endTime`, `allDay`, `workerId`

### Test 6.2: Overlap Check Uses Normalized Fields
**Steps:**
1. Load planning entries (from backend with snake_case)
2. Create overlapping entry
3. **Expected:** Overlap validation works correctly
4. **Expected:** No errors about missing fields

## Console Test Helper

Open browser console and run:
```javascript
window.testPlanningOverlap()
```

**Expected:** Console shows test results for overlap validation logic.

## Regression Checklist

- [ ] Confirm idempotent across reload (no duplicate time entries)
- [ ] Self-planning restrictions enforced (worker can only plan for self)
- [ ] Permissions for certificates (worker sees only own, admin sees all)
- [ ] Overlap prevention works (frontend + backend)
- [ ] Team calendar stable (no crashes)
- [ ] Planning entries persist after reload
- [ ] Medical certificates persist after reload
- [ ] No console errors during normal operation



