import { DEFAULT_MOVEMENT_ACTION, MODULE_ID, RULE_IDS, SETTINGS } from "../constants.js";

/**
 * Dépendances par défaut, branchées sur Foundry en production. Injectables
 * via `deps` pour permettre un test sans runtime Foundry.
 */
function defaultDeps() {
  return {
    getSetting: (key) => game.settings.get(MODULE_ID, key),
  };
}

/**
 * Distance en PIEDS d'une mesure : `cost` en priorité, `distance` en repli —
 * jamais `spaces` (cases).
 * @param {{cost?: number, distance?: number}} measured
 * @returns {number|undefined}
 */
function feetOf(measured) {
  return typeof measured?.cost === "number" ? measured.cost : measured?.distance;
}

/**
 * Plafond applicable (en pieds) pour une action de déplacement.
 * - `null` : aucune restriction (téléportation, vitesse inconnue).
 * - `0` : mode indisponible pour cet acteur.
 * Consomme `context.speedByAction` fourni par `readMovementContext()` ; repli
 * sur `context.speed` seul pour les contextes qui n'exposent pas la carte.
 * @param {object} context
 * @param {string} action
 * @returns {number|null}
 */
function limitFor(context, action) {
  const speeds = context.speedByAction;
  if (speeds && Object.hasOwn(speeds, action)) return speeds[action];

  return typeof context.speed === "number" && context.speed > 0 ? context.speed : null;
}

/**
 * Motif de blocage, enrichi du mode de déplacement quand il est connu et qu'il
 * n'est pas la marche (le libellé dnd5e de la marche est « Vitesse », inutile
 * dans la phrase).
 * @param {object} context
 * @param {string} action
 * @param {number} limit
 * @returns {{key: string, data: object}}
 */
function blockedReason(context, action, limit) {
  const label = context.actionLabels?.[action];

  if (!label || action === DEFAULT_MOVEMENT_ACTION) {
    return { key: "FQRESTRAIN.notifications.distanceBlocked", data: { speed: limit } };
  }

  if (limit === 0) {
    return { key: "FQRESTRAIN.notifications.actionSpeedMissing", data: { action: label } };
  }

  return {
    key: "FQRESTRAIN.notifications.distanceBlockedAction",
    data: { speed: limit, action: label },
  };
}

/**
 * Règle de limite de vitesse de combat, sensible au mode de déplacement.
 * En combat et au tour du token, bloque tout déplacement dont le cumul mesuré
 * en PIEDS dépasse la vitesse du mode utilisé (marche, vol, terrier, escalade,
 * nage — cf. `src/movement.js`). Hors combat, hors tour, gridless ou vitesse
 * inconnue : no-op.
 *
 * Modes mélangés dans un même tour : applique la règle dnd5e de bascule de
 * vitesse — à chaque segment, le cumul parcouru depuis le début du tour doit
 * rester dans la vitesse du mode utilisé sur ce segment (« soustrayez la
 * distance déjà parcourue de la nouvelle vitesse »). N'est appliqué que si la
 * mesure expose les cumuls par waypoint ; sinon, repli sur une comparaison du
 * cumul total à la vitesse de l'action courante.
 *
 * Logique pure : `evaluate(context)` consomme `context.inCombat`,
 * `context.isYourTurn`, `context.speedByAction`, `context.movementAction` et
 * `context.grid` ; seul `isEnabled()` lit un réglage, via `deps.getSetting`.
 *
 * @param {{ getSetting?: (key: string) => any }} [deps]
 * @returns {{ id: string, isEnabled: () => boolean, evaluate: (context: object) => { allowed: boolean, reason: ({key: string, data: object}|null) } }}
 */
export function makeDistanceRule(deps = {}) {
  const { getSetting } = { ...defaultDeps(), ...deps };

  return {
    id: RULE_IDS.distance,

    isEnabled: () => Boolean(getSetting(SETTINGS.distanceEnabled)),

    evaluate(context) {
      // No-op hors combat ou hors du tour du token.
      if (!context.inCombat || !context.isYourTurn) {
        return { allowed: true, reason: null };
      }

      // Scènes gridless : no-op, jamais de crash.
      if (context.grid?.isGridless) {
        return { allowed: true, reason: null };
      }

      const currentAction = context.movementAction ?? DEFAULT_MOVEMENT_ACTION;

      // Trajet réellement parcouru cumulé sur le tour si le payload l'expose
      // (souris et clavier), sinon mesure origine→destination.
      const hasPath = Array.isArray(context.path) && context.path.length > 1;
      const waypoints = hasPath ? context.path : [context.from, context.to];

      // Mesure sensible au mode (coût des actions, terrain) quand le contexte
      // l'expose ; repli sur la mesure de grille brute.
      const measure = context.measurePath ?? ((points) => context.grid.measurePath(points));
      const result = measure(waypoints);

      const total = feetOf(result);
      context.distance = total;

      // Cumuls par waypoint : règle de bascule segment par segment.
      const cumulative = Array.isArray(result?.waypoints) ? result.waypoints : null;
      if (cumulative && cumulative.length === waypoints.length) {
        for (let index = 1; index < waypoints.length; index += 1) {
          const action = waypoints[index]?.action ?? currentAction;
          const limit = limitFor(context, action);
          if (limit === null) continue;

          const travelled = feetOf(cumulative[index]);
          if (typeof travelled !== "number") continue;

          if (travelled > limit) {
            return { allowed: false, reason: blockedReason(context, action, limit) };
          }
        }

        return { allowed: true, reason: null };
      }

      // Repli : cumul total comparé à la vitesse du mode courant.
      const limit = limitFor(context, currentAction);
      if (limit === null || typeof total !== "number") {
        return { allowed: true, reason: null };
      }

      const allowed = total <= limit;

      return {
        allowed,
        reason: allowed ? null : blockedReason(context, currentAction, limit),
      };
    },
  };
}
