/**
 * Todo Event Handlers
 * Handles todo CRUD operations
 */

import { on } from './events.js';
import { 
  getState, 
  setState
} from '../state/index.js';
import { renderApp } from '../views/renderApp.js';
import { 
  createTodo, 
  updateTodo, 
  deleteTodo, 
  toggleTodo,
  loadTodos
} from '../services/todoService.js';
import { getTodo } from '../state/index.js';
import { renderTodoModal } from '../views/modals/todoModal.js';
import { showToast } from '../utils/ui.js';
import { formatDateLocal } from '../utils/format.js';

/**
 * Bind todo handlers
 */
export function bindTodoHandlers() {
  // Open create todo modal (from planning header)
  on('click', '[data-action="open-notes-modal"]', (e) => {
    e.preventDefault();
    const state = getState();
    
    // Determine scope based on current view
    let scope = 'PLAN_DAY';
    let scopeId = null;
    
    if (state.ui.calendarViewMode === 'week') {
      scope = 'PLAN_WEEK';
      // Get week start (Monday)
      const calendarDate = state.ui.calendarDate || new Date();
      const date = new Date(calendarDate);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      scopeId = formatDateLocal(monday);
    } else {
      scope = 'PLAN_DAY';
      scopeId = state.ui.activeDate || 
                (state.ui.calendarDate ? formatDateLocal(new Date(state.ui.calendarDate)) : null) ||
                formatDateLocal(new Date());
    }
    
    openTodoModal(null, scope, scopeId);
  });
  
  // Open create todo modal (from management)
  on('click', '[data-action="open-create-todo"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="open-create-todo"]');
    const scope = btn?.getAttribute('data-scope') || 'ADMIN_GLOBAL';
    
    openTodoModal(null, scope, null);
  });
  
  // Open edit todo modal
  on('click', '[data-action="edit-todo"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="edit-todo"]');
    const todoId = btn?.getAttribute('data-todo-id');
    
    if (todoId) {
      const todo = getTodo(todoId);
      if (todo) {
        openTodoModal(todo);
      } else {
        showToast('Notiz nicht gefunden', 'error');
      }
    }
  });
  
  // Delete todo
  on('click', '[data-action="delete-todo"]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target.closest('[data-action="delete-todo"]');
    const todoId = btn?.getAttribute('data-todo-id');
    
    if (!todoId) return;
    
    if (!confirm('Möchten Sie diese Notiz wirklich löschen?')) {
      return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Lösche...';
    
    try {
      const result = await deleteTodo(todoId);
      
      if (result.success) {
        showToast('Notiz gelöscht', 'success');
        renderApp();
      } else {
        showToast(`Fehler: ${result.error || 'Unbekannter Fehler'}`, 'error');
        btn.disabled = false;
        btn.textContent = '🗑️';
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      showToast(`Fehler: ${error.message || 'Unbekannter Fehler'}`, 'error');
      btn.disabled = false;
      btn.textContent = '🗑️';
    }
  });
  
  // Toggle todo completed
  on('change', '[data-action="toggle-todo"]', async (e) => {
    const checkbox = e.target;
    const todoId = checkbox.getAttribute('data-todo-id');
    
    if (!todoId) return;
    
    checkbox.disabled = true;
    
    try {
      const result = await toggleTodo(todoId);
      
      if (result.success) {
        renderApp();
      } else {
        showToast(`Fehler: ${result.error || 'Unbekannter Fehler'}`, 'error');
        checkbox.disabled = false;
        checkbox.checked = !checkbox.checked; // Revert
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
      showToast(`Fehler: ${error.message || 'Unbekannter Fehler'}`, 'error');
      checkbox.disabled = false;
      checkbox.checked = !checkbox.checked; // Revert
    }
  });
  
  // Todo form submit
  on('submit', '#form-todo', async (e) => {
    e.preventDefault();
    const form = e.target;
    const todoId = form.getAttribute('data-todo-id');
    const isEdit = !!todoId;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Speichere...' : 'Erstelle...';
    
    try {
      // Get form data
      const formData = new FormData(form);
      const title = formData.get('title');
      const description = formData.get('description') || '';
      const scope = formData.get('scope');
      const scopeId = formData.get('scopeId') || null;
      const completed = formData.has('completed');
      
      // Build todo data
      const todoData = {
        title,
        description: description || null,
        scope,
        scopeId: scope === 'ADMIN_GLOBAL' ? null : scopeId,
        completed: completed ? 1 : 0
      };
      
      let result;
      if (isEdit) {
        // Update existing todo
        result = await updateTodo(todoId, todoData);
      } else {
        // Create new todo
        result = await createTodo(todoData);
      }
      
      if (result.success) {
        showToast(isEdit ? 'Notiz aktualisiert' : 'Notiz erstellt', 'success');
        closeTodoModal();
        renderApp();
      } else {
        showToast(`Fehler: ${result.error || 'Unbekannter Fehler'}`, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Error saving todo:', error);
      showToast(`Fehler: ${error.message || 'Unbekannter Fehler'}`, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
  
  // Close todo modal
  on('click', '#btn-close-todo-modal, #btn-cancel-todo, [data-close]', (e) => {
    if (e.target.closest('.modal-overlay') || e.target.id === 'btn-close-todo-modal' || e.target.id === 'btn-cancel-todo') {
      e.preventDefault();
      closeTodoModal();
    }
  });
  
  // Toggle scope ID field based on scope
  on('change', '#todo-scope', (e) => {
    const scope = e.target.value;
    const scopeIdField = document.getElementById('todo-scope-id-field');
    const scopeIdInput = document.getElementById('todo-scope-id');
    
    if (scopeIdField && scopeIdInput) {
      if (scope === 'ADMIN_GLOBAL') {
        scopeIdField.style.display = 'none';
        scopeIdInput.removeAttribute('required');
      } else {
        scopeIdField.style.display = '';
        scopeIdInput.setAttribute('required', 'required');
        
        // Set default date if empty
        if (!scopeIdInput.value) {
          const state = getState();
          const activeDate = state.ui.activeDate || 
                           (state.ui.calendarDate ? formatDateLocal(new Date(state.ui.calendarDate)) : null) ||
                           formatDateLocal(new Date());
          
          if (scope === 'PLAN_DAY') {
            scopeIdInput.value = activeDate;
          } else if (scope === 'PLAN_WEEK') {
            // Get week start (Monday)
            const date = new Date(activeDate + 'T00:00:00');
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date.setDate(diff));
            scopeIdInput.value = formatDateLocal(monday);
          }
        }
      }
    }
  });
}

/**
 * Open todo modal
 */
function openTodoModal(todo = null, defaultScope = null, defaultScopeId = null) {
  // Use modal-root if available, otherwise create modal-host
  let modalHost = document.getElementById('modal-root');
  if (!modalHost) {
    modalHost = document.getElementById('modal-host');
  }
  if (!modalHost) {
    // Create modal host if it doesn't exist
    modalHost = document.createElement('div');
    modalHost.id = 'modal-host';
    document.body.appendChild(modalHost);
  }
  
  modalHost.innerHTML = renderTodoModal(todo, defaultScope, defaultScopeId);
  
  // Focus first input
  const firstInput = modalHost.querySelector('input, select, textarea');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * Close todo modal
 */
function closeTodoModal() {
  const modalHost = document.getElementById('modal-host') || document.getElementById('modal-root');
  if (modalHost) {
    modalHost.innerHTML = '';
  }
}

