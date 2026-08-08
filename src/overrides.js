import { MODULE_ID, FLAGS, SETTINGS } from "./constants.js";
import { isBypassHeld } from "./settings.js";

/**
 * Dépendances par défaut, branchées sur Foundry en production. Injectables
 * via `deps` pour permettre un test sans runtime Foundry.
 */
function defaultDeps() {
  return {
    getSetting: (key) => game.settings.get(MODULE_ID, key),
    isGM: game.user?.isGM,
    isBypassHeld,
  };
}

/**
 * Le token porte-t-il le flag `exempt` ?
 * Lecture défensive : supporte `getFlag()` (API Foundry) et l'accès direct
 * `flags[MODULE_ID][FLAGS.exempt]` (utile en test).
 * @param {object} tokenDocument
 * @returns {boolean}
 */
export function isExempt(tokenDocument) {
  if (!tokenDocument) return false;

  if (typeof tokenDocument.getFlag === "function") {
    return Boolean(tokenDocument.getFlag(MODULE_ID, FLAGS.exempt));
  }

  return Boolean(tokenDocument.flags?.[MODULE_ID]?.[FLAGS.exempt]);
}

/**
 * Le MJ est-il exempté des restrictions ?
 * @param {{ isGM: boolean, getSetting: (key: string) => any }} deps
 * @returns {boolean}
 */
export function isGmBypassed(deps) {
  return Boolean(deps.isGM && deps.getSetting(SETTINGS.gmNotRestrained));
}

/**
 * Agrège les trois sources d'override (flag exempt, MJ exempté, bypass tenu)
 * en un booléen unique consommé par decision.js via `context.override`.
 * @param {object} context - contexte de mouvement (tokenDocument requis).
 * @param {{ getSetting: Function, isGM: boolean, isBypassHeld: () => boolean }} [deps]
 * @returns {boolean}
 */
export function computeOverride(context, deps = defaultDeps()) {
  return (
    isExempt(context.tokenDocument) ||
    isGmBypassed(deps) ||
    Boolean(deps.isBypassHeld())
  );
}
