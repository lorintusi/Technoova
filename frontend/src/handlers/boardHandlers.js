/**
 * Weekly Dispatch Board – Handler
 * Navigation Woche, Ressourcenauswahl (links), Drag & Drop auf DropZone. Kein Modal.
 */

import { on } from './events.js';
import { getState, setState } from '../state/index.js';
import { setActiveDate, setSelectedResource } from '../state/actions.js';
import { formatDateLocal } from '../utils/format.js';
import { renderApp } from '../views/renderApp.js';
import { addResourceToSlot } from '../services/dispatchService.js';
import { showToast } from '../utils/ui.js';

export function bindBoardHandlers() {
  // Woche vor/zurück
  on('click', '[data-action="board-prev-week"]', (e) => {
    e.preventDefault();
    const state = getState();
    const cal = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
    cal.setDate(cal.getDate() - 7);
    setState({ ui: { ...state.ui, calendarDate: cal } });
    setActiveDate(formatDateLocal(cal));
    renderApp();
  });

  on('click', '[data-action="board-next-week"]', (e) => {
    e.preventDefault();
    const state = getState();
    const cal = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
    cal.setDate(cal.getDate() + 7);
    setState({ ui: { ...state.ui, calendarDate: cal } });
    setActiveDate(formatDateLocal(cal));
    renderApp();
  });

  // Ressource auswählen (linkes Panel)
  on('click', '[data-action="select-board-resource"]', (e) => {
    e.preventDefault();
    const el = e.target.closest('[data-action="select-board-resource"]');
    const type = el?.getAttribute('data-resource-type');
    const id = el?.getAttribute('data-resource-id');
    if (type && id) {
      setSelectedResource(type, id);
      renderApp();
    }
  });

  // Drag & Drop: Ressource auf DropZone
  on('dragover', '[data-drop="board-cell"]', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const zone = e.target.closest('[data-drop="board-cell"]');
    if (zone) zone.classList.add('drop-zone--over');
  });

  on('dragleave', '[data-drop="board-cell"]', (e) => {
    const zone = e.target.closest('[data-drop="board-cell"]');
    if (zone) zone.classList.remove('drop-zone--over');
  });

  on('drop', '[data-drop="board-cell"]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const zone = e.target.closest('[data-drop="board-cell"]');
    if (zone) zone.classList.remove('drop-zone--over');
    // Ohne Einsatzort ist Zuweisung fachlich nicht möglich
    if (zone?.getAttribute('data-has-location') !== 'true') {
      showToast('Kein Einsatzort – Zuweisung nicht möglich', 'error');
      return;
    }
    const date = zone?.getAttribute('data-slot-date');
    const assignmentId = zone?.getAttribute('data-assignment-id');
    if (!date || !assignmentId) return;
    let dragData = null;
    try {
      const json = e.dataTransfer.getData('application/json');
      if (json) dragData = JSON.parse(json);
    } catch (_) {}
    if (!dragData?.type || !dragData?.id) return;
    try {
      const result = await addResourceToSlot(assignmentId, date, dragData.type, dragData.id);
      if (result.success) {
        showToast('Ressource zugewiesen', 'success');
        renderApp();
      } else {
        showToast(result.error || 'Fehler beim Zuweisen', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Zuweisen', 'error');
    }
  });
}
