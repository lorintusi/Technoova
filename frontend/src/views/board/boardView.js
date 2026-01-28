/**
 * Planungsboard – zentrale Arbeitsansicht
 * Weekly Dispatch Board: Ressourcen (links) | Zeitachse mit Tagesspalten (Mitte).
 * Kein Kontextpanel – direkte Board-Manipulation.
 */

import { renderBoardResources } from './boardResources.js';
import { renderWeeklyDispatchBoard } from './weeklyDispatchBoard.js';

export function renderBoardView() {
  return `
    <div class="board" role="main">
      ${renderBoardResources()}
      ${renderWeeklyDispatchBoard()}
    </div>
  `;
}
