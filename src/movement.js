/**
 * Lecteurs de mode de déplacement (dnd5e). Même patron que `src/combat.js` :
 * les entrées Foundry/dnd5e passent par `deps` (injectables via
 * `defaultDeps()`), la logique reste pure et testable sans runtime.
 *
 * Le module est explicitement lié à dnd5e (cf. `relationships.systems` dans
 * `module.json`) : la résolution de vitesse suit `CONFIG.DND5E.movementTypes`
 * (dont l'indicateur `walkFallback` d'escalade/nage) et les actions de
 * déplacement Foundry `CONFIG.Token.movement.actions` (dont l'indicateur
 * `teleport`).
 */

import { DEFAULT_MOVEMENT_ACTION, WALK_FALLBACK_ACTIONS } from "./constants.js";

/**
 * Dépendances par défaut, branchées sur Foundry/dnd5e en production.
 * Lectures défensives : aucun accès n'échoue si `CONFIG` n'est pas peuplé.
 * @returns {{ getActionConfig: (action: string) => object|undefined, getActionIds: () => string[], getMovementTypeConfig: (action: string) => object|undefined, localize: (key: string) => string }}
 */
function defaultDeps() {
  return {
    getActionConfig: (action) =>
      typeof CONFIG !== "undefined" ? CONFIG?.Token?.movement?.actions?.[action] : undefined,
    getActionIds: () =>
      typeof CONFIG !== "undefined" ? Object.keys(CONFIG?.Token?.movement?.actions ?? {}) : [],
    getMovementTypeConfig: (action) =>
      typeof CONFIG !== "undefined" ? CONFIG?.DND5E?.movementTypes?.[action] : undefined,
    localize: (key) => (typeof game !== "undefined" ? game.i18n.localize(key) : key),
  };
}

/**
 * Normalise une vitesse dnd5e : nombre fini positif ou nul, sinon `null`
 * (vitesse inconnue — jamais `0` par défaut, pour distinguer « pas de donnée »
 * de « vitesse nulle »).
 * @param {any} value
 * @returns {number|null}
 */
function toSpeed(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Action de déplacement en jeu pour cette mise à jour : l'action portée par
 * l'update si elle change, sinon celle du token, sinon la marche.
 * @param {object} tokenDocument
 * @param {object} [changes]
 * @returns {string}
 */
export function getMovementAction(tokenDocument, changes) {
  return changes?.movementAction ?? tokenDocument?.movementAction ?? DEFAULT_MOVEMENT_ACTION;
}

/**
 * L'action retombe-t-elle sur la vitesse de marche ? Vrai pour la marche et le
 * saut (`WALK_FALLBACK_ACTIONS`), pour les types dnd5e marqués `walkFallback`
 * (escalade, nage) et pour toute action inconnue de dnd5e (ramper, etc.) —
 * même logique que la règle colorée du système.
 * @param {string} action
 * @param {{ getMovementTypeConfig: (action: string) => object|undefined }} deps
 * @returns {boolean}
 */
export function usesWalkFallback(action, deps) {
  if (WALK_FALLBACK_ACTIONS.includes(action)) return true;

  const config = deps.getMovementTypeConfig(action);
  return !config || Boolean(config.walkFallback);
}

/**
 * Plafond de déplacement (en pieds) pour une action donnée.
 * - `null` : aucune restriction applicable (téléportation, ou acteur sans
 *   aucune donnée de vitesse — véhicule, token sans acteur...).
 * - `0` : l'acteur ne peut pas se déplacer dans ce mode (vitesse à 0, que ce
 *   soit la marche d'un acteur entravé ou une action « vol » sans vitesse de
 *   vol) — tout déplacement dans ce mode est bloqué.
 * - `n > 0` : plafond en pieds.
 * @param {string} action
 * @param {object|null} speeds - `actor.system.attributes.movement.speeds` (dnd5e 6
 *   a déplacé les vitesses de la racine de `movement` vers cette carte)
 * @param {{ getActionConfig: Function, getMovementTypeConfig: Function }} deps
 * @returns {number|null}
 */
export function resolveActionSpeed(action, speeds, deps) {
  if (!speeds) return null;

  // Téléportation (blink, displace...) : hors budget de déplacement.
  if (deps.getActionConfig(action)?.teleport) return null;

  const own = toSpeed(speeds[action]);

  if (usesWalkFallback(action, deps)) {
    const walk = toSpeed(speeds.walk);

    // Aucune des deux vitesses n'est renseignée (véhicule, acteur hors schéma
    // créature...) : on ne restreint pas, faute de donnée exploitable.
    if (own === null && walk === null) return null;

    // Repli marche : le plafond est le meilleur des deux. Une vitesse à 0
    // renseignée reste un plafond à 0 — l'acteur ne peut pas bouger.
    return Math.max(own ?? 0, walk ?? 0);
  }

  // Mode dédié (vol, terrier) : pas de repli. `0` bloque, absent ne restreint pas.
  return own;
}

/**
 * Libellé localisé d'une action, pour les notifications. Priorité au libellé
 * dnd5e du type de mouvement, repli sur celui de l'action Foundry, puis sur
 * l'identifiant brut.
 * @param {string} action
 * @param {{ getActionConfig: Function, getMovementTypeConfig: Function, localize: Function }} deps
 * @returns {string}
 */
export function getActionLabel(action, deps) {
  const key = deps.getMovementTypeConfig(action)?.label ?? deps.getActionConfig(action)?.label;
  return key ? deps.localize(key) : action;
}

/**
 * Agrège le contexte de mode de déplacement, fusionné dans le contexte de
 * mouvement par `buildMovementContext()` :
 * - `movementAction` : action de cette mise à jour ;
 * - `speed` : plafond de l'action courante (compatibilité, message de blocage) ;
 * - `speedByAction` : plafond par action, consommé segment par segment par la
 *   règle de distance (un tour peut mélanger marche puis vol) ;
 * - `actionLabels` : libellés localisés par action.
 * @param {object} tokenDocument
 * @param {object} [changes]
 * @param {object} [deps]
 * @returns {{ movementAction: string, speed: number|undefined, speedByAction: Record<string, number|null>, actionLabels: Record<string, string> }}
 */
export function readMovementContext(tokenDocument, changes, deps = {}) {
  const resolved = { ...defaultDeps(), ...deps };

  // dnd5e 6 : les vitesses vivent sous `movement.speeds` (un shim de lecture
  // couvre encore `movement.walk`, mais il disparaît en dnd5e 7).
  const speeds = tokenDocument?.actor?.system?.attributes?.movement?.speeds ?? null;
  const movementAction = getMovementAction(tokenDocument, changes);

  // L'action courante est toujours couverte, même absente du registre Foundry.
  const actions = new Set([...resolved.getActionIds(), movementAction]);

  const speedByAction = {};
  const actionLabels = {};
  for (const action of actions) {
    speedByAction[action] = resolveActionSpeed(action, speeds, resolved);
    actionLabels[action] = getActionLabel(action, resolved);
  }

  return {
    movementAction,
    speed: speedByAction[movementAction] ?? undefined,
    speedByAction,
    actionLabels,
  };
}
