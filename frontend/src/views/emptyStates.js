/**
 * Empty State Components
 * Provides friendly messages when no data is available
 */

export function renderEmptyState(type, options = {}) {
  const states = {
    'no-workers': {
      icon: '👥',
      title: 'Kein Personal vorhanden',
      message: 'Fügen Sie Personal hinzu, um mit der Planung zu beginnen.',
      action: { text: 'Personal hinzufügen', dataAction: 'create-worker' }
    },
    'no-vehicles': {
      icon: '🚗',
      title: 'Keine Fahrzeuge vorhanden',
      message: 'Fügen Sie Fahrzeuge hinzu, um sie in Einsätze einzuplanen.',
      action: { text: 'Fahrzeug hinzufügen', dataAction: 'create-vehicle' }
    },
    'no-devices': {
      icon: '🔧',
      title: 'Keine Geräte vorhanden',
      message: 'Fügen Sie Geräte und Werkzeuge hinzu, die Sie verwalten möchten.',
      action: { text: 'Gerät hinzufügen', dataAction: 'create-device' }
    },
    'no-locations': {
      icon: '📍',
      title: 'Keine Einsatzorte vorhanden',
      message: 'Erstellen Sie Einsatzorte, bevor Sie Personal einplanen.',
      action: { text: 'Einsatzort erstellen', dataAction: 'create-location' }
    },
    'no-assignments': {
      icon: '📋',
      title: 'Keine Einsätze vorhanden',
      message: 'Erstellen Sie einen Einsatz, um mit der Planung zu beginnen.',
      action: { text: 'Einsatz erstellen', dataAction: 'create-assignment' }
    },
    'no-results': {
      icon: '🔍',
      title: 'Keine Ergebnisse',
      message: options.query ? `Keine Ergebnisse für "${options.query}"` : 'Keine Einträge gefunden.',
      action: null
    },
    'no-location-selected': {
      icon: '⚠️',
      title: 'Kein Einsatzort ausgewählt',
      message: 'Wählen Sie einen Einsatzort aus oder erstellen Sie einen neuen.',
      action: { text: 'Einsatzort erstellen', dataAction: 'create-location' }
    },
    'location-required': {
      icon: '📍',
      title: 'Einsatzort erforderlich',
      message: 'Personal, Fahrzeuge und Geräte können nur einem Einsatzort zugewiesen werden.',
      action: { text: 'Einsatzort hinzufügen', dataAction: 'create-location' },
      variant: 'warning'
    }
  };
  
  const config = states[type] || states['no-results'];
  const variant = config.variant || 'default';
  
  return `
    <div class="empty-state empty-state--${variant}">
      <div class="empty-state__icon">${config.icon}</div>
      <h3 class="empty-state__title">${config.title}</h3>
      <p class="empty-state__message">${config.message}</p>
      ${config.action ? `
        <button 
          type="button" 
          class="empty-state__action btn btn--primary" 
          data-action="${config.action.dataAction}"
        >
          ${config.action.text}
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Inline empty state (for list items)
 */
export function renderInlineEmptyState(message, icon = '📭') {
  return `
    <div class="inline-empty-state">
      <span class="inline-empty-state__icon">${icon}</span>
      <span class="inline-empty-state__text">${message}</span>
    </div>
  `;
}

