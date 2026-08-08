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
 * Règle de limite de vitesse de combat.
 * En combat et au tour du token, bloque tout déplacement dont le cumul mesuré
 * en PIEDS (`measurePath().cost`, repli `.distance` — jamais `.spaces`) dépasse
 * la vitesse de marche (`context.speed`). Hors combat, hors tour, gridless ou
 * vitesse inconnue : no-op.
 *
 * Logique pure : `evaluate(context)` consomme `context.inCombat`,
 * `context.isYourTurn`, `context.speed` et `context.grid` ; seul `isEnabled()`
 * lit un réglage, via `deps.getSetting` (injectable).
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

      // Défensif : sans vitesse connue et positive, impossible de limiter.
      const speed = context.speed;
      if (typeof speed !== "number" || !(speed > 0)) {
        return { allowed: true, reason: null };
      }

      // Trajet réellement parcouru cumulé sur le tour si le payload l'expose
      // (souris et clavier), sinon mesure origine→destination.
      const hasPath = Array.isArray(context.path) && context.path.length > 1;
      const result = hasPath
        ? context.grid.measurePath(context.path)
        : context.grid.measurePath([context.from, context.to]);

      // Distance parcourue en PIEDS : `cost` en priorité, `distance` en repli —
      // jamais `spaces` (cases).
      const feet = typeof result.cost === "number" ? result.cost : result.distance;
      context.distance = feet;

      const allowed = feet <= speed;

      return {
        allowed,
        reason: allowed
          ? null
          : { key: "FQRESTRAIN.notifications.distanceBlocked", data: { speed } },
      };
    },
  };
}
