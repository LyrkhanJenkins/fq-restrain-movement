import { computeOverride } from "./overrides.js";
import { readCombatContext } from "./combat.js";
import { getEngagedPosition, updateEngagedPosition } from "./tracking.js";
import { evaluate } from "./engine/decision.js";

/**
 * Extrait le trajet réellement parcouru exposé par le payload `preUpdateToken` :
 * - Souris (glisser) : `changes._movementHistory` porte le breadcrumb complet
 *   du glisser en un seul update — déjà le trajet complet du mouvement.
 * - Clavier (flèches) : chaque update n'avance que d'une case, mais
 *   `tokenDocument.movementHistory` accumule les pas déjà commités sur le
 *   tour ; on y ajoute la destination proposée par l'update courante pour
 *   mesurer le trajet cumulé du tour (et non le pas isolé), nécessaire pour
 *   que la limite s'applique au clavier.
 * Retourne `null` si aucun trajet n'est exposé par le payload (repli sur
 * origine→destination fait par la règle elle-même).
 * @param {object} tokenDocument
 * @param {object} changes
 * @param {{x: number, y: number}} to
 * @returns {Array<{x: number, y: number}>|null}
 */
function extractPath(tokenDocument, changes, to) {
  if (Array.isArray(changes?._movementHistory) && changes._movementHistory.length > 1) {
    return changes._movementHistory.map((point) => ({ x: point.x, y: point.y }));
  }

  const history = Array.isArray(tokenDocument?.movementHistory) ? tokenDocument.movementHistory : [];
  if (history.length > 0) {
    return [...history.map((point) => ({ x: point.x, y: point.y })), { x: to.x, y: to.y }];
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

  return {
    from,
    to,
    path: extractPath(tokenDocument, changes, to),
    tokenDocument,
    userId,
    isGM: game.user?.isGM,
    grid: canvas.grid,
    changes,
    options,
    // Contexte de combat : inCombat/isYourTurn/speed, consommés par la règle
    // de distance. Lecteurs isolés et mockables.
    ...readCombatContext(tokenDocument),
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
