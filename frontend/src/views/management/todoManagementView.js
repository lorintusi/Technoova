/**
 * Todo Management View
 * Shows todos with ADMIN_GLOBAL scope
 */

import { getState } from '../../state/index.js';
import { getTodos } from '../../state/selectors.js';
import { formatDateForDisplay } from '../../utils/format.js';

/**
 * Render todo management view
 */
export function renderTodoManagementView() {
  const state = getState();
  const currentUser = state.data.currentUser;
  
  // Get todos with ADMIN_GLOBAL scope
  const todos = getTodos('ADMIN_GLOBAL');
  const completedTodos = todos.filter(t => t.completed || t.completed === 1);
  const activeTodos = todos.filter(t => !t.completed && t.completed !== 1);
  
  return `
    <div class="todo-management">
      <div class="todo-management__header">
        <div>
          <h2>Allgemeine Notizen</h2>
          <p>Verwalten Sie globale Notizen und TODOs.</p>
        </div>
        <div class="management__actions">
          <button class="btn btn--primary" data-action="open-create-todo" data-scope="ADMIN_GLOBAL">
            <span class="btn-icon">+</span>
            <span class="btn-text">Notiz hinzufügen</span>
          </button>
        </div>
      </div>
      
      <div class="todo-management__stats">
        <div class="todo-stat">
          <span class="todo-stat__label">Aktiv:</span>
          <span class="todo-stat__value">${activeTodos.length}</span>
        </div>
        <div class="todo-stat">
          <span class="todo-stat__label">Erledigt:</span>
          <span class="todo-stat__value">${completedTodos.length}</span>
        </div>
      </div>
      
      <div class="todo-management__list">
        ${activeTodos.length === 0 && completedTodos.length === 0 ? `
          <div class="todo-management__empty">
            <div class="todo-management__empty-icon">📝</div>
            <div class="todo-management__empty-text">Keine Notizen vorhanden</div>
            <div class="todo-management__empty-hint">Klicken Sie auf "Notiz hinzufügen" um eine neue Notiz zu erstellen.</div>
          </div>
        ` : `
          ${activeTodos.length > 0 ? `
            <div class="todo-section">
              <h3 class="todo-section__title">Aktiv (${activeTodos.length})</h3>
              <div class="todo-list">
                ${activeTodos.map(todo => renderTodoItem(todo)).join('')}
              </div>
            </div>
          ` : ''}
          ${completedTodos.length > 0 ? `
            <div class="todo-section">
              <h3 class="todo-section__title">Erledigt (${completedTodos.length})</h3>
              <div class="todo-list todo-list--completed">
                ${completedTodos.map(todo => renderTodoItem(todo)).join('')}
              </div>
            </div>
          ` : ''}
        `}
      </div>
    </div>
  `;
}

/**
 * Render todo item
 */
function renderTodoItem(todo) {
  const createdDate = todo.createdAt || todo.created_at;
  const createdDateStr = createdDate ? formatDateForDisplay(new Date(createdDate)) : '';
  const isCompleted = todo.completed || todo.completed === 1;
  
  return `
    <div class="todo-item ${isCompleted ? 'todo-item--completed' : ''}" data-todo-id="${todo.id}">
      <div class="todo-item__checkbox">
        <input 
          type="checkbox" 
          ${isCompleted ? 'checked' : ''}
          data-action="toggle-todo"
          data-todo-id="${todo.id}"
        />
      </div>
      <div class="todo-item__content">
        <div class="todo-item__title">${todo.title}</div>
        ${todo.description ? `<div class="todo-item__description">${todo.description}</div>` : ''}
        <div class="todo-item__meta">
          <span class="todo-item__date">Erstellt: ${createdDateStr}</span>
        </div>
      </div>
      <div class="todo-item__actions">
        <button class="btn-icon" data-action="edit-todo" data-todo-id="${todo.id}" title="Bearbeiten">✏️</button>
        <button class="btn-icon" data-action="delete-todo" data-todo-id="${todo.id}" title="Löschen">🗑️</button>
      </div>
    </div>
  `;
}


