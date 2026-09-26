/**
 * Lecteurs de mode de déplacement. Même patron que `src/combat.js` : les
 * entrées Foundry passent par `deps` (injectables via `defaultDeps()`), la
 * logique reste pure et testable sans runtime.
 *
 * Tout ce qui est propre à un système de jeu — où vivent les vitesses sur la
 * fiche, dans quelle unité, quels modes de déplacement existent — est délégué
 * à un adaptateur système (`src/systems/`). Ce fichier ne connaît que des API
 * cœur de Foundry : les actions de déplacement `CONFIG.Token.movement.actions`
 * (dont l'indicateur `teleport`) et l'unité de distance de la scène.
 *
 * Quand aucun adaptateur ne rend de vitesse exploitable (système inconnu,
 * véhicule, jeton sans acteur), les plafonds valent `null` : la règle de
 * limite de vitesse devient un no-op, les autres restrictions restent actives.
 */

import { DEFAULT_MOVEMENT_ACTION, WALK_FALLBACK_ACTIONS } from "./constants.js";
import { getSystemAdapter } from "./systems/index.js";
import { convertSpeeds } from "./units.js";

/** Adaptateur neutre : aucune vitesse, aucun mode de déplacement déclaré. */
const NULL_ADAPTER = {
  readSpeeds: () => null,
  getMovementTypes: () => ({}),
};

/**
 * Dépendances par défaut, branchées sur Foundry et sur l'adaptateur du système
 * courant en production. Lectures défensives : aucun accès n'échoue si
 * `CONFIG`/`canvas` ne sont pas peuplés.
 * @returns {{ getActionConfig: Function, getActionIds: Function, getMovementTypeConfig: Function, readSpeeds: Function, getGridUnits: Function, localize: Function }}
 */
function defaultDeps() {
  const adapter = getSystemAdapter() ?? NULL_ADAPTER;
  const movementTypes = adapter.getMovementTypes?.() ?? {};

  return {
    getActionConfig: (action) =>
      typeof CONFIG !== "undefined" ? CONFIG?.Token?.movement?.actions?.[action] : undefined,
    getActionIds: () =>
      typeof CONFIG !== "undefined" ? Object.keys(CONFIG?.Token?.movement?.actions ?? {}) : [],
    getMovementTypeConfig: (action) => movementTypes[action],
    readSpeeds: (actor) => adapter.readSpeeds(actor),
    getGridUnits: () =>
      typeof canvas !== "undefined"
        ? (canvas?.scene?.grid?.units ?? canvas?.grid?.units)
        : undefined,
    localize: (key) => (typeof game !== "undefined" ? game.i18n.localize(key) : key),
  };
}

/**
 * Normalise une vitesse : nombre fini positif ou nul, sinon `null` (vitesse
 * inconnue — jamais `0` par défaut, pour distinguer « pas de donnée » de
 * « vitesse nulle »).
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
 * saut (`WALK_FALLBACK_ACTIONS`), pour les modes que l'adaptateur marque
 * `walkFallback` (escalade et nage en dnd5e comme en pf2e) et pour toute
 * action que l'adaptateur ne déclare pas (ramper, système inconnu...) : à
 * défaut de connaître la règle du système, on reste permissif.
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
 * Plafond de déplacement pour une action donnée, dans l'unité de la carte de
 * vitesses reçue.
 * - `null` : aucune restriction applicable (téléportation, ou acteur sans
 *   aucune donnée de vitesse — véhicule, token sans acteur, système dont les
 *   vitesses ne sont pas localisables).
 * - `0` : l'acteur ne peut pas se déplacer dans ce mode (vitesse à 0, que ce
 *   soit la marche d'un acteur entravé ou une action « vol » sans vitesse de
 *   vol) — tout déplacement dans ce mode est bloqué.
 * - `n > 0` : plafond.
 * @param {string} action
 * @param {object|null} speeds - carte `{ action: vitesse }` rendue par l'adaptateur système
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
 * du mode de déplacement rendu par l'adaptateur système, repli sur celui de
 * l'action Foundry, puis sur l'identifiant brut.
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
 * - `actionLabels` : libellés localisés par action ;
 * - `speedUnits` : unité dans laquelle les plafonds sont exprimés, pour les
 *   notifications.
 *
 * Les vitesses de l'acteur sont converties dans l'unité de la scène quand les
 * deux unités sont connues et diffèrent (fiche en mètres sur une scène en
 * pieds, et inversement) : la mesure de trajet, elle, est toujours rendue dans
 * l'unité de la scène.
 * @param {object} tokenDocument
 * @param {object} [changes]
 * @param {object} [deps]
 * @returns {{ movementAction: string, speed: number|undefined, speedByAction: Record<string, number|null>, actionLabels: Record<string, string>, speedUnits: string|undefined }}
 */
export function readMovementContext(tokenDocument, changes, deps = {}) {
  const resolved = { ...defaultDeps(), ...deps };

  const read = resolved.readSpeeds(tokenDocument?.actor ?? null);
  const gridUnits = resolved.getGridUnits();
  const speeds = convertSpeeds(read?.speeds ?? null, read?.units, gridUnits);

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
    speedUnits: gridUnits ?? read?.units,
  };
}
