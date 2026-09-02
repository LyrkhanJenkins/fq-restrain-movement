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
 * Règle d'interdiction d'annuler un déplacement (take-back).
 * Bloque tout déplacement dont la destination RÉDUIT STRICTEMENT la distance à
 * `context.engagedPosition` (mesurée via `context.grid.measurePath`, même outil
 * que la règle distance : `cost` prioritaire, repli `distance` — jamais
 * `spaces`). Un déplacement latéral ou qui s'éloigne (distance égale ou
 * supérieure) est autorisé.
 *
 * Comme turn/distance, la règle ne s'applique qu'EN COMBAT : hors combat, le
 * déplacement est libre, retour sur ses pas compris. Second garde-fou :
 * l'absence de `context.engagedPosition` (token pas encore engagé) : no-op.
 *
 * Logique pure : `evaluate(context)` ne lit que `context.*` (`inCombat`,
 * `engagedPosition`, `from`, `to`, `grid`). Cette règle n'importe jamais
 * `tracking.js` — l'état arrive uniquement via le contexte, ce qui préserve la
 * testabilité par fixtures. Seul `isEnabled()` lit un réglage, via `deps.getSetting`
 * (injectable). La règle ne connaît pas l'override (MJ/exempt) : c'est
 * `evaluate()` (decision.js) qui court-circuite via `context.override`.
 *
 * @param {{ getSetting?: (key: string) => any }} [deps]
 * @returns {{ id: string, isEnabled: () => boolean, evaluate: (context: object) => { allowed: boolean, reason: ({key: string, data: object}|null) } }}
 */
export function makeTakeBackRule(deps = {}) {
  const { getSetting } = { ...defaultDeps(), ...deps };

  return {
    id: RULE_IDS.takeBack,

    isEnabled: () => Boolean(getSetting(SETTINGS.takeBackEnabled)),

    evaluate(context) {
      // No-op hors combat : le déplacement y est libre.
      if (!context.inCombat) {
        return { allowed: true, reason: null };
      }

      // No-op si le token n'est pas (encore) engagé.
      if (!context.engagedPosition) {
        return { allowed: true, reason: null };
      }

      // Scènes gridless : no-op, jamais de crash — measurePath n'est jamais
      // appelé sans grille valide.
      if (context.grid?.isGridless) {
        return { allowed: true, reason: null };
      }

      // Distance AVANT le déplacement proposé (origine -> position engagée).
      const beforeResult = context.grid.measurePath([context.from, context.engagedPosition]);
      const distBefore =
        typeof beforeResult.cost === "number" ? beforeResult.cost : beforeResult.distance;

      // Distance APRÈS le déplacement proposé (destination -> position engagée).
      const afterResult = context.grid.measurePath([context.to, context.engagedPosition]);
      const distAfter =
        typeof afterResult.cost === "number" ? afterResult.cost : afterResult.distance;

      // Réduction STRICTE : latéral/égal/éloignement -> autorisé.
      const allowed = !(distAfter < distBefore);

      return {
        allowed,
        reason: allowed
          ? null
          : { key: "FQRESTRAIN.notifications.takeBackBlocked", data: {} },
      };
    },
  };
}
