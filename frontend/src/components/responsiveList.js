/**
 * Responsive List Component
 * Renders as table on desktop, cards on mobile
 */

import { escapeHtml, escapeAttr, sanitizeId } from '../utils/sanitize.js';

/**
 * Render responsive list
 * @param {Array} items - Array of items to render
 * @param {Object} config - Configuration object
 * @param {string} config.entityName - Entity name (singular)
 * @param {Array} config.columns - Column definitions [{key, label, render?}]
 * @param {Function} config.onEdit - Edit handler (item) => void
 * @param {Function} config.onDelete - Delete handler (item) => void
 * @param {string} config.emptyMessage - Empty state message
 * @param {Function} config.onAdd - Add handler () => void
 * @returns {string} HTML string
 */
export function renderResponsiveList(items, config) {
  const {
    entityName = 'Eintrag',
    columns = [],
    onEdit,
    onDelete,
    emptyMessage = 'Keine Einträge vorhanden',
    onAdd
  } = config;
  
  if (!items || items.length === 0) {
    return `
      <div class="empty-state">
        <p>${emptyMessage}</p>
        ${onAdd ? `<button class="btn btn--primary" data-action="add-${entityName.toLowerCase()}">${entityName} hinzufügen</button>` : ''}
      </div>
    `;
  }
  
  // Desktop: Table
  const tableHtml = `
    <div class="responsive-list__table">
      <table class="table">
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.label}</th>`).join('')}
            ${(onEdit || onDelete) ? '<th class="table__actions">Aktionen</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${items.map(item => renderTableRow(item, columns, onEdit, onDelete, entityName)).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  // Mobile: Cards
  const cardsHtml = `
    <div class="responsive-list__cards">
      ${items.map(item => renderCard(item, columns, onEdit, onDelete, entityName)).join('')}
    </div>
  `;
  
  return `
    <div class="responsive-list">
      ${tableHtml}
      ${cardsHtml}
    </div>
  `;
}

/**
 * Render table row
 */
function renderTableRow(item, columns, onEdit, onDelete, entityName) {
  const safeId = sanitizeId(item.id);
  const safeEntityName = escapeAttr(entityName.toLowerCase());
  
  return `
    <tr>
      ${columns.map(col => {
        const rawValue = col.render ? col.render(item[col.key], item) : item[col.key];
        // If render function returns HTML (like badges), don't escape. Otherwise escape.
        const value = col.render ? rawValue : escapeHtml(rawValue);
        return `<td>${value || '-'}</td>`;
      }).join('')}
      ${(onEdit || onDelete) ? `
        <td class="table__actions">
          ${onEdit ? `<button class="btn btn--sm btn--secondary" data-action="edit-${safeEntityName}" data-id="${safeId}">Bearbeiten</button>` : ''}
          ${onDelete ? `<button class="btn btn--sm btn--danger" data-action="delete-${safeEntityName}" data-id="${safeId}">Löschen</button>` : ''}
        </td>
      ` : ''}
    </tr>
  `;
}

/**
 * Render card (mobile)
 */
function renderCard(item, columns, onEdit, onDelete, entityName) {
  const safeId = sanitizeId(item.id);
  const safeEntityName = escapeAttr(entityName.toLowerCase());
  
  return `
    <div class="card card--mobile">
      <div class="card__body">
        ${columns.map(col => {
          const rawValue = col.render ? col.render(item[col.key], item) : item[col.key];
          // If render function returns HTML (like badges), don't escape. Otherwise escape.
          const value = col.render ? rawValue : escapeHtml(rawValue);
          return `
            <div class="card-field">
              <div class="card-field__label">${escapeHtml(col.label)}</div>
              <div class="card-field__value">${value || '-'}</div>
            </div>
          `;
        }).join('')}
      </div>
      ${(onEdit || onDelete) ? `
        <div class="card__actions">
          ${onEdit ? `<button class="btn btn--sm btn--secondary" data-action="edit-${safeEntityName}" data-id="${safeId}">Bearbeiten</button>` : ''}
          ${onDelete ? `<button class="btn btn--sm btn--danger" data-action="delete-${safeEntityName}" data-id="${safeId}">Löschen</button>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

