import { MODULE_ID, SETTINGS } from "./constants.js";

/**
 * Service de suivi de la position engagée. L'état est module-level : une `Map`
 * indexée par `tokenDocument.id` porte `{ x, y, freezeTime }` par token.
 *
 * Le suivi vaut en combat comme hors combat.
 *
 * Le gel est évalué paresseusement à la lecture (`getEngagedPosition`) via une
 * comparaison `now() >= freezeTime` : aucun timer réel (`setTimeout`), donc
 * aucune fuite de ressource.
 *
 * Les lecteurs/écrivains ci-dessous sont purs et paramétrés par un `deps`
 * injectable (`getSetting`/`getCombat`/`now`), testables sans runtime Foundry.
 * `registerTracking()` est la seule glue Foundry (hook `updateCombat`).
 */

/** État module-level : position engagée par token. */
let engagedPositions = new Map();

/**
 * Dépendances par défaut, branchées sur Foundry en production. Injectables via
 * `deps` pour permettre un test sans runtime Foundry ni timer réel. `now` est
 * l'horloge injectable — aucun `Date.now()` en dur ailleurs dans ce module.
 * @returns {{ getSetting: (key: string) => any, getCombat: () => object|null|undefined, now: () => number }}
 */
function defaultDeps() {
  return {
    getSetting: (key) => game.settings.get(MODULE_ID, key),
    getCombat: () => game.combat,
    now: () => Date.now(),
  };
}

/**
 * Lit le réglage `takeBackGraceSeconds` avec un plancher défensif à 0 : valeur
 * négative, `NaN` ou non numérique -> 0.
 * @param {{ getSetting: (key: string) => any }} deps
 * @returns {number} secondes de grâce, toujours >= 0.
 */
function readGraceSeconds(deps) {
  const raw = Number(deps.getSetting(SETTINGS.takeBackGraceSeconds));
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
}

/**
 * Retourne la position engagée opposable d'un token, ou `null`.
 * - Entrée absente -> `null`.
 * - `deps.now() >= freezeTime` -> `{ x, y }` (figée, opposable).
 * - Sinon -> `null` (fenêtre de grâce encore ouverte : le retour est libre).
 * @param {string} tokenId
 * @param {{ now: () => number }} [deps]
 * @returns {{ x: number, y: number }|null}
 */
export function getEngagedPosition(tokenId, deps = defaultDeps()) {
  const entry = engagedPositions.get(tokenId);
  if (!entry) return null;

  if (deps.now() >= entry.freezeTime) {
    return { x: entry.x, y: entry.y };
  }

  return null;
}

/**
 * Appelée après un mouvement accepté. En combat -> no-op. Hors combat ->
 * engage l'origine du mouvement (`context.from`) comme position à ne plus
 * rejoindre, avec `freezeTime = deps.now() + grâce_ms`. Écrase l'entrée
 * existante de ce token.
 * @param {{ inCombat: boolean, tokenDocument: { id: string }, from: { x: number, y: number } }} context
 * @param {{ getSetting: (key: string) => any, now: () => number }} [deps]
 */
export function updateEngagedPosition(context, deps = defaultDeps()) {
  if (context?.inCombat) return;

  const tokenId = context?.tokenDocument?.id;
  if (!tokenId || !context?.from) return;

  const graceSeconds = readGraceSeconds(deps);

  engagedPositions.set(tokenId, {
    x: context.from.x,
    y: context.from.y,
    freezeTime: deps.now() + graceSeconds * 1000,
  });
}

/**
 * Engage la position courante d'un token avec gel immédiat
 * (`freezeTime = deps.now()`) : la grâce ne s'applique pas au reset de tour.
 * Défensif : no-op si `tokenDocument` ou son `id` est absent.
 * @param {{ id: string, x: number, y: number }} tokenDocument
 * @param {{ now: () => number }} [deps]
 */
export function engageAtTurnStart(tokenDocument, deps = defaultDeps()) {
  if (!tokenDocument?.id) return;

  engagedPositions.set(tokenDocument.id, {
    x: tokenDocument.x,
    y: tokenDocument.y,
    freezeTime: deps.now(),
  });
}

/**
 * Supprime le suivi d'un token (reset de tour du combattant précédent).
 * @param {string} tokenId
 */
export function resetEngagedPosition(tokenId) {
  engagedPositions.delete(tokenId);
}

/**
 * Glue de changement de tour : engage le combattant courant à sa position de
 * début de tour, et réinitialise le suivi du combattant précédent quand il est
 * identifiable. Lecture défensive du combat (tolère `tokenId` ou `token.id`).
 * @param {{ getCombat: () => object|null|undefined, now: () => number }} [deps]
 */
export function onCombatTurnChange(deps = defaultDeps()) {
  const combat = deps.getCombat();
  if (!combat) return;

  engageAtTurnStart(combat.combatant?.token, deps);

  const previousCombatantId = combat.previous?.combatantId;
  if (!previousCombatantId) return;

  const previousCombatant =
    typeof combat.combatants?.get === "function"
      ? combat.combatants.get(previousCombatantId)
      : combat.combatants?.find?.((combatant) => combatant.id === previousCombatantId);

  const previousTokenId = previousCombatant?.tokenId ?? previousCombatant?.token?.id;
  if (previousTokenId) {
    resetEngagedPosition(previousTokenId);
  }
}

/**
 * Vide l'état de suivi. Utilitaire de test.
 */
export function clearTracking() {
  engagedPositions.clear();
}

/**
 * Glue Foundry. Enregistre le hook de changement de tour.
 *
 * `updateCombat` se déclenche à chaque mise à jour du document combat (y
 * compris changement de tour) et est largement disponible.
 * @param {object} [deps]
 */
export function registerTracking(deps = defaultDeps()) {
  Hooks.on("updateCombat", () => onCombatTurnChange(deps));
}
