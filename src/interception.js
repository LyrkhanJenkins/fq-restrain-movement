import { computeOverride } from "./overrides.js";
import { readCombatContext } from "./combat.js";
import { readMovementContext, getMovementAction } from "./movement.js";
import { getEngagedPosition, updateEngagedPosition } from "./tracking.js";
import { evaluate } from "./engine/decision.js";

/**
 * Normalise un point de trajet en waypoint mesurable : coordonnées, élévation
 * si exposée, et action de déplacement du segment (repli sur l'action courante
 * du mouvement). L'action par waypoint est ce qui permet à la règle de distance
 * d'appliquer la bascule de vitesse quand un tour mélange marche et vol.
 * @param {object} point
 * @param {string} fallbackAction
 * @returns {{x: number, y: number, elevation?: number, action: string}}
 */
function toWaypoint(point, fallbackAction) {
  const waypoint = { x: point.x, y: point.y, action: point.action ?? fallbackAction };
  if (point.elevation !== undefined) waypoint.elevation = point.elevation;
  return waypoint;
}

/**
 * Extrait le trajet réellement parcouru exposé par le payload `preUpdateToken` :
 * - Souris (glisser) : `changes._movementHistory` porte le breadcrumb complet
 *   du glisser en un seul update — déjà le trajet complet du mouvement.
 * - Clavier (flèches) : chaque update n'avance que d'une case, mais
 *   `tokenDocument.movementHistory` accumule les pas déjà commités sur le
 *   tour ; on y ajoute la destination proposée par l'update courante pour
 *   mesurer le trajet cumulé du tour (et non le pas isolé), nécessaire pour
 *   que la limite s'applique au clavier.
 * Chaque point conserve son action de déplacement : les pas déjà commités
 * gardent la leur, la destination proposée prend celle de l'update.
 * Retourne `null` si aucun trajet n'est exposé par le payload (repli sur
 * origine→destination fait par la règle elle-même).
 * @param {object} tokenDocument
 * @param {object} changes
 * @param {{x: number, y: number}} to
 * @param {string} movementAction
 * @returns {Array<{x: number, y: number, action: string}>|null}
 */
function extractPath(tokenDocument, changes, to, movementAction) {
  if (Array.isArray(changes?._movementHistory) && changes._movementHistory.length > 1) {
    return changes._movementHistory.map((point) => toWaypoint(point, movementAction));
  }

  const history = Array.isArray(tokenDocument?.movementHistory) ? tokenDocument.movementHistory : [];
  if (history.length > 0) {
    return [
      ...history.map((point) => toWaypoint(point, movementAction)),
      toWaypoint({ ...to, elevation: changes?.elevation }, movementAction),
    ];
  }

  return null;
}

/**
 * Construit le contexte de mouvement complet consommé par le moteur
 * (overrides + decision).
 * @param {object} tokenDocument
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 * @returns {object}
 */
export function buildMovementContext(tokenDocument, changes, options, userId) {
  const from = { x: tokenDocument.x, y: tokenDocument.y };
  const to = { x: changes.x ?? tokenDocument.x, y: changes.y ?? tokenDocument.y };
  const movementAction = getMovementAction(tokenDocument, changes);

  return {
    from,
    to,
    path: extractPath(tokenDocument, changes, to, movementAction),
    tokenDocument,
    userId,
    isGM: game.user?.isGM,
    grid: canvas.grid,
    // Mesure sensible au mode de déplacement (coût par action, terrain) quand
    // le document l'expose (Foundry v13+) ; repli sur la mesure de grille brute.
    measurePath: (waypoints) =>
      typeof tokenDocument.measureMovementPath === "function"
        ? tokenDocument.measureMovementPath(waypoints)
        : canvas.grid.measurePath(waypoints),
    changes,
    options,
    // Contexte de combat : inCombat/isYourTurn, consommés par la règle
    // de distance. Lecteurs isolés et mockables.
    ...readCombatContext(tokenDocument),
    // Contexte de mode de déplacement : movementAction/speed/speedByAction,
    // consommés par la règle de distance (dnd5e).
    ...readMovementContext(tokenDocument, changes),
    // Position engagée : injectée depuis le service de suivi (tracking.js),
    // consommée par la règle take-back. La règle reste pure — elle ne lit
    // jamais tracking.js directement.
    engagedPosition: getEngagedPosition(tokenDocument.id),
  };
}
/**
 * Enregistre le veto de déplacement via le hook `preUpdateToken` (souris et
 * clavier). Câblage : contexte complet -> override -> decision -> notification.
 * Garde client : ne vetoe que sur le client à l'origine du déplacement.
 */
export function registerInterception() {
  Hooks.on("preUpdateToken", (tokenDocument, changes, options, userId) => {
    // Garde client : ne vetoer que sur le client à l'origine du déplacement.
    if (userId !== game.user.id) return true;

    // Pas un déplacement (x/y non modifiés) : rien à faire.
    if (changes.x === undefined && changes.y === undefined) return true;

    const context = buildMovementContext(tokenDocument, changes, options, userId);
    context.override = computeOverride(context);

    const decision = evaluate(context);

    if (decision.allowed === false) {
      const msg = decision.reason?.key
        ? game.i18n.format(decision.reason.key, decision.reason.data ?? {})
        : game.i18n.localize("FQRESTRAIN.notifications.distanceBlocked");
      ui.notifications.warn(msg);
      return false;
    }

    // Mouvement accepté : met à jour le suivi de la position engagée.
    updateEngagedPosition(context);

    return true;
  });
}
