/**
 * Planning Entry Handlers
 * Create, Edit, Delete planning entries with permission checks
 */

import { on } from './events.js';
import { 
  getState, 
  getActiveDate, 
  getSelectedPlanningWorkerId, 
  getActiveWorkerId, 
  getActiveUserId,
  getPlanningEntriesForDay
} from '../state/index.js';
import { renderApp } from '../views/renderApp.js';
import { renderPlanningEntryModal } from '../views/modals/planningEntryModal.js';
import { openModal, closeModal } from '../views/modals/modalHost.js';
import { 
  createPlanningEntry, 
  updatePlanningEntryService, 
  deletePlanningEntry 
} from '../services/planningService.js';
import { validatePlanningEntryOverlap } from '../utils/planningValidation.js';
import { 
  canPlanFor, 
  canEditPlanningEntry, 
  canDeletePlanningEntry,
  getPlanningSource,
  getCreatedByRole
} from '../utils/permissions.js';
import { showToast } from '../utils/ui.js';
import { formatDateLocal } from '../utils/format.js';

const MODAL_ID = 'planning-entry-modal';

/**
 * Open create planning entry modal
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string|number} workerId - Worker ID
 */
export function openCreatePlanningEntryModal(date = null, workerId = null) {
  const state = getState();
  const currentUser = state.data.currentUser;
  
  if (!currentUser) {
    showToast('Bitte melden Sie sich an', 'error');
    return;
  }
  
  // Determine worker ID
  const targetWorkerId = workerId || 
                         getSelectedPlanningWorkerId() || 
                         getActiveWorkerId() || 
                         getActiveUserId();
  
  // Permission check
      if (!canPlanFor(currentUser, targetWorkerId)) {
    showToast('Sie können nur für sich selbst planen', 'error');
    return;
  }
  
  // Determine date
  const targetDate = date || getActiveDate() || formatDateLocal(new Date());
  
  // Render and open modal
  const html = renderPlanningEntryModal(null, targetDate, targetWorkerId);
  openModal(MODAL_ID, html, {
    onMount: (container) => {
      setupPlanningModalHandlers(container);
    }
  });
}

/**
 * Open edit planning entry modal
 * @param {string|number} entryId - Planning entry ID
 */
export function openEditPlanningEntryModal(entryId) {
  const state = getState();
  const currentUser = state.data.currentUser;
  const entry = state.planning.entries.find(e => e.id === entryId);
  
  if (!entry) {
    showToast('Planungseintrag nicht gefunden', 'error');
    return;
  }
  
  // Permission check
  if (!canEditPlanningEntry(currentUser, entry)) {
    showToast('Sie haben keine Berechtigung, diesen Eintrag zu bearbeiten', 'error');
    return;
  }
  
  // Render and open modal
  const html = renderPlanningEntryModal(entry);
  openModal(MODAL_ID, html, {
    onMount: (container) => {
      setupPlanningModalHandlers(container);
    }
  });
}

/**
 * Delete planning entry
 * @param {string|number} entryId - Planning entry ID
 */
export async function deletePlanningEntryHandler(entryId, btnElement = null) {
  const state = getState();
  const currentUser = state.data.currentUser;
  const entry = state.planning.entries.find(e => e.id === entryId);
  
  if (!entry) {
    showToast('Planungseintrag nicht gefunden', 'error');
    return;
  }
  
  // Permission check
  if (!canDeletePlanningEntry(currentUser, entry)) {
    showToast('Sie haben keine Berechtigung, diesen Eintrag zu löschen', 'error');
    return;
  }
  
  // Confirm deletion
  if (!confirm('Möchten Sie diesen Planungsblock wirklich löschen?')) {
    return;
  }
  
  // Disable button during request
  let originalHTML = null;
  if (btnElement) {
    originalHTML = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '⏳';
  }
  
  try {
    const result = await deletePlanningEntry(entryId);
    
    if (result.success) {
      showToast('Planungsblock gelöscht', 'success');
      renderApp();
    } else {
      let errorMessage = result.error || 'Unbekannter Fehler';
      if (result.status === 403 || result.status === 401) {
        errorMessage = 'Keine Berechtigung';
      } else if (result.status >= 500) {
        errorMessage = 'Serverfehler';
      }
      showToast(`Fehler beim Löschen: ${errorMessage}`, 'error');
      if (btnElement && originalHTML) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalHTML;
      }
    }
  } catch (error) {
    console.error('Error deleting planning entry:', error);
    let errorMessage = error.message || 'Unbekannter Fehler';
    if (error.status === 403 || error.status === 401) {
      errorMessage = 'Keine Berechtigung';
    } else if (error.status >= 500) {
      errorMessage = 'Serverfehler';
    }
    showToast(`Fehler beim Löschen: ${errorMessage}`, 'error');
    if (btnElement && originalHTML) {
      btnElement.disabled = false;
      btnElement.innerHTML = originalHTML;
    }
  }
}

/**
 * Setup planning modal handlers (category change, all-day toggle, etc.)
 */
function setupPlanningModalHandlers(container) {
  // Category definitions
  const categories = {
    'PROJEKT': { requiresProject: true, requiresMedicalCertificate: false },
    'SCHULUNG': { requiresProject: false, requiresMedicalCertificate: false },
    'BUERO': { requiresProject: false, requiresMedicalCertificate: false },
    'TRAINING': { requiresProject: false, requiresMedicalCertificate: false },
    'KRANK': { requiresProject: false, requiresMedicalCertificate: true },
    'MEETING': { requiresProject: false, requiresMedicalCertificate: false }
  };
  
  // Category change handler
  const categorySelect = container.querySelector('#planning-category');
  const projectField = container.querySelector('#planning-project-field');
  const projectSelect = container.querySelector('#planning-location');
  const medicalField = container.querySelector('#planning-medical-certificate-field');
  const medicalInput = container.querySelector('#planning-medical-certificate');
  
  function updateFieldsVisibility() {
    const selectedCategory = categorySelect?.value || '';
    const category = categories[selectedCategory];
    
    if (category) {
      // Show/hide project field
      if (projectField) {
        projectField.style.display = category.requiresProject ? 'block' : 'none';
        if (projectSelect) {
          projectSelect.required = category.requiresProject;
        }
      }
      
      // Show/hide medical certificate field
      if (medicalField) {
        medicalField.style.display = category.requiresMedicalCertificate ? 'block' : 'none';
        if (medicalInput) {
          medicalInput.required = category.requiresMedicalCertificate && !container.querySelector('[data-certificate-id]');
        }
      }
    } else {
      // Hide both if no category selected
      if (projectField) projectField.style.display = 'none';
      if (medicalField) medicalField.style.display = 'none';
      if (projectSelect) projectSelect.required = false;
      if (medicalInput) medicalInput.required = false;
    }
  }
  
  if (categorySelect) {
    categorySelect.addEventListener('change', updateFieldsVisibility);
    // Initial update
    updateFieldsVisibility();
  }
  
  // Toggle all-day checkbox
  const allDayCheckbox = container.querySelector('#planning-all-day');
  const timeRow = container.querySelector('#planning-time-row');
  
  if (allDayCheckbox && timeRow) {
    allDayCheckbox.addEventListener('change', (e) => {
      timeRow.style.display = e.target.checked ? 'none' : 'flex';
      const startTime = container.querySelector('#planning-start-time');
      const endTime = container.querySelector('#planning-end-time');
      if (e.target.checked) {
        if (startTime) startTime.required = false;
        if (endTime) endTime.required = false;
      } else {
        if (startTime) startTime.required = true;
        if (endTime) endTime.required = true;
      }
    });
  }
}

/**
 * Bind planning entry handlers
 */
export function bindPlanningEntryHandlers() {
  // Open create modal
  on('click', '[data-action="open-create-planning-entry"]', (e) => {
    e.preventDefault();
    const date = e.target.closest('[data-date]')?.getAttribute('data-date');
    const workerId = e.target.closest('[data-worker-id]')?.getAttribute('data-worker-id');
    openCreatePlanningEntryModal(date, workerId);
  });
  
  // Open edit modal
  on('click', '[data-action="edit-planning-entry"]', (e) => {
    e.preventDefault();
    const entryId = e.target.closest('[data-planning-entry-id]')?.getAttribute('data-planning-entry-id');
    if (entryId) {
      openEditPlanningEntryModal(entryId);
    }
  });
  
  // Delete entry
  on('click', '[data-action="delete-planning-entry"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="delete-planning-entry"]');
    const entryId = btn?.getAttribute('data-planning-entry-id');
    if (entryId) {
      deletePlanningEntryHandler(entryId, btn);
    }
  });
  
  // Save form
  on('submit', '#form-planning-entry', async (e) => {
    e.preventDefault();
    const form = e.target;
    const entryId = form.getAttribute('data-planning-entry-id');
    const isEdit = !!entryId;
    
    const state = getState();
    const currentUser = state.data.currentUser;
    
    // Get form data
    const formData = new FormData(form);
    const workerId = formData.get('workerId');
    const date = formData.get('date');
    const allDay = formData.get('allDay') === 'on';
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');
    const locationId = formData.get('locationId') || null;
    const category = formData.get('category');
    const note = formData.get('note') || '';
    
    // Permission check
    if (isEdit) {
      const entry = state.planning.entries.find(e => e.id === entryId);
      if (!canEditPlanningEntry(currentUser, entry)) {
        showToast('Sie haben keine Berechtigung, diesen Eintrag zu bearbeiten', 'error');
        return;
      }
    } else {
      if (!canPlanFor(currentUser, workerId)) {
        showToast('Sie können nur für sich selbst planen', 'error');
        return;
      }
    }
    
    // Validate
    if (!category) {
      showToast('Bitte wählen Sie eine Kategorie', 'error');
      return;
    }
    
    // Category-specific validation
    const categories = {
      'PROJEKT': { requiresProject: true, requiresMedicalCertificate: false },
      'KRANK': { requiresProject: false, requiresMedicalCertificate: true }
    };
    
    const categoryRules = categories[category];
    if (categoryRules) {
      if (categoryRules.requiresProject && !locationId) {
        showToast('Bei Kategorie PROJEKT muss eine Baustelle ausgewählt werden', 'error');
        return;
      }
      
      if (categoryRules.requiresMedicalCertificate) {
        const medicalFileInput = form.querySelector('#planning-medical-certificate');
        const medicalFile = medicalFileInput?.files?.[0];
        const existingCertificate = state.data.medicalCertificates.find(c => c.planningEntryId === entryId);
        
        if (!medicalFile && !existingCertificate) {
          showToast('Bei Kategorie KRANK muss ein Arztzeugnis hochgeladen werden', 'error');
          return;
        }
      }
    }
    
    // Overlap validation: Check for conflicts with existing entries
    const entryToValidate = {
      id: entryId,
      workerId,
      date,
      allDay,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      category,
      locationId,
      locationName: locationId ? (state.data.locations.find(l => l.id === locationId)?.code || state.data.locations.find(l => l.id === locationId)?.address) : null
    };
    
    // Get existing entries for the same worker and date
    const existingDayEntries = getPlanningEntriesForDay(date, workerId);
    
    // Validate overlap
    const overlapCheck = validatePlanningEntryOverlap(entryToValidate, existingDayEntries, entryId);
    if (!overlapCheck.ok) {
      showToast(overlapCheck.message || 'Planungskonflikt erkannt', 'error');
      return;
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Speichere...';
    }
    
    try {
      // First, save planning entry
      const entryData = {
        workerId,
        date,
        allDay,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
        locationId: category === 'PROJEKT' ? locationId : null, // Only set if PROJEKT
        category,
        note,
        status: 'PLANNED',
        source: getPlanningSource(currentUser),
        createdByUserId: getActiveUserId(),
        createdByRole: getCreatedByRole(currentUser)
      };
      
      let result;
      if (isEdit) {
        result = await updatePlanningEntryService(entryId, entryData);
      } else {
        result = await createPlanningEntry(entryData);
      }
      
      if (!result.success) {
        // Handle specific error types
        let errorMessage = result.error || 'Fehler beim Speichern der Planung';
        if (result.status === 409 || (result.error && result.error.includes('Konflikt'))) {
          errorMessage = result.error || 'Planungskonflikt erkannt';
        } else if (result.status === 403 || result.status === 401) {
          errorMessage = 'Keine Berechtigung';
        } else if (result.status >= 500) {
          errorMessage = 'Serverfehler';
        }
        showToast(errorMessage, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
        return;
      }
      
      const savedEntryId = result.entry?.id || entryId;
      
      // Handle medical certificate upload if KRANK category
      if (category === 'KRANK') {
        const medicalFileInput = form.querySelector('#planning-medical-certificate');
        const medicalFile = medicalFileInput?.files?.[0];
        const existingCertificate = state.data.medicalCertificates.find(c => c.planningEntryId === savedEntryId);
        
        // Check if we need to upload (new file or replace existing)
        if (medicalFile && medicalFile.size > 0) {
          try {
            const { api } = await import('../api/endpoints.js');
            const { addMedicalCertificate } = await import('../state/actions.js');
            
            // Delete existing certificate if replacing
            if (existingCertificate) {
              try {
                await api.deleteMedicalCertificate(existingCertificate.id);
              } catch (error) {
                console.warn('Error deleting existing certificate:', error);
                // Continue anyway
              }
            }
            
            // Upload new certificate
            const uploadResult = await api.uploadMedicalCertificate({
              workerId,
              date,
              planningEntryId: savedEntryId,
              file: medicalFile,
              note: note || null
            });
            
            if (uploadResult.success) {
              addMedicalCertificate({
                ...uploadResult.data,
                downloadUrl: api.getMedicalCertificateDownloadUrl(uploadResult.data.id)
              });
            } else {
              console.error('Error uploading certificate:', uploadResult.error);
              // Don't fail the whole operation, but warn user
              showToast('Planung gespeichert, aber Arztzeugnis-Upload fehlgeschlagen: ' + (uploadResult.error || 'Unbekannter Fehler'), 'warning');
            }
          } catch (error) {
            console.error('Error uploading medical certificate:', error);
            showToast('Planung gespeichert, aber Arztzeugnis-Upload fehlgeschlagen: ' + error.message, 'warning');
          }
        } else if (!existingCertificate) {
          // No file and no existing certificate - this should have been caught by validation
          console.warn('No medical certificate file provided for KRANK category');
        }
      }
      
      showToast(isEdit ? 'Planung aktualisiert' : 'Planungsblock hinzugefügt', 'success');
      closeModal(MODAL_ID);
      renderApp();
    } catch (error) {
      console.error('Error saving planning entry:', error);
      showToast(`Fehler beim Speichern: ${error.message}`, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // Close modal
  on('click', '#btn-close-planning-modal, #btn-cancel-planning-modal, [data-close]', (e) => {
    if (e.target.closest('.modal-overlay') || e.target.id === 'btn-close-planning-modal' || e.target.id === 'btn-cancel-planning-modal') {
      closeModal(MODAL_ID);
    }
  });
}

