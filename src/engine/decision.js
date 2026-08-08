import { HOOK_EVALUATE } from "../constants.js";
import { getRules } from "./registry.js";

const NOOP_HOOKS = { callAll() {} };

/**
 * Décision pure : logique testable sans runtime Foundry. `context.override`
 * (booléen agrégé) et l'activation des règles (`rule.isEnabled()`) sont fournis
 * en amont — decision.js ne lit ni réglage ni flag directement.
 *
 * Ordre :
 * 1. Décision de base `allowed: true`.
 * 2. Override-wins : si `context.override === true`, court-circuite les règles
 *    → `allowed: true`, `rule: "override"`, aucune règle évaluée.
 * 3. Sinon, parcourt `getRules()` par précédence ; ignore les règles dont
 *    `isEnabled()` est faux ; la première règle activée qui bloque fixe
 *    `allowed`, `reason`, `rule` et stoppe.
 * 4. Toujours appeler `Hooks.callAll(HOOK_EVALUATE, decision, changes, options, userId)`
 *    en dernier : un listener peut muter `decision.allowed`/`decision.reason`.
 *
 * @param {object} context - contexte de mouvement (inCombat, isYourTurn, speed, override, grid, from, to, engagedPosition).
 * @param {{ hooks?: { callAll: Function } }} [deps]
 * @returns {{ allowed: boolean, reason?: string, from: object, to: object, distance?: number, rule?: string, tokenDocument: object }}
 */
export function evaluate(context, deps = {}) {
  const hooks = deps.hooks ?? (typeof Hooks !== "undefined" ? Hooks : NOOP_HOOKS);

  const decision = {
    allowed: true,
    reason: undefined,
    from: context.from,
    to: context.to,
    distance: context.distance,
    rule: undefined,
    tokenDocument: context.tokenDocument,
  };

  if (context.override === true) {
    decision.rule = "override";
  } else {
    for (const rule of getRules()) {
      if (!rule.isEnabled()) continue;

      const result = rule.evaluate(context);
      if (result.allowed === false) {
        decision.allowed = false;
        decision.reason = result.reason;
        decision.rule = rule.id;
        break;
      }
    }
  }

  hooks.callAll(HOOK_EVALUATE, decision, context.changes, context.options, context.userId);

  return decision;
}
