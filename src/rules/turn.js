import { MODULE_ID, RULE_IDS, SETTINGS } from "../constants.js";

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
 * Règle de blocage hors de son tour.
 * En combat, si ce n'est PAS le tour du token (`context.isYourTurn === false`),
 * tout déplacement est bloqué. Hors combat : no-op.
 *
 * Logique pure : `evaluate(context)` consomme `context.inCombat` et
 * `context.isYourTurn` ; seul `isEnabled()` lit un réglage, via
 * `deps.getSetting` (injectable). La règle ne connaît pas l'override
 * (MJ/exempt) : c'est `evaluate()` (decision.js) qui court-circuite via
 * `context.override`.
 *
 * @param {{ getSetting?: (key: string) => any }} [deps]
 * @returns {{ id: string, isEnabled: () => boolean, evaluate: (context: object) => { allowed: boolean, reason: ({key: string, data: object}|null) } }}
 */
export function makeTurnRule(deps = {}) {
  const { getSetting } = { ...defaultDeps(), ...deps };

  return {
    id: RULE_IDS.turn,

    isEnabled: () => Boolean(getSetting(SETTINGS.turnEnabled)),

    evaluate(context) {
      // No-op hors combat.
      if (!context.inCombat) {
        return { allowed: true, reason: null };
      }

      // En combat, hors du tour du token → blocage total.
      if (context.isYourTurn === false) {
        return {
          allowed: false,
          reason: { key: "FQRESTRAIN.notifications.turnBlocked", data: {} },
        };
      }

      // En combat, à son tour → autorisé (la limite de vitesse est gérée par
      // la règle distance).
      return { allowed: true, reason: null };
    },
  };
}
