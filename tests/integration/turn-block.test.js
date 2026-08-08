import { describe, it, expect, beforeEach } from "vitest";
import { evaluate } from "../../src/engine/decision.js";
import { registerRule, clearRules } from "../../src/engine/registry.js";
import { makeTurnRule } from "../../src/rules/turn.js";
import { makeDistanceRule } from "../../src/rules/distance.js";
import { makeContext, makeGrid } from "../fixtures/movement.js";
import { RULE_IDS } from "../../src/constants.js";

/**
 * Vérifie de bout en bout le chemin complet « blocage hors de son tour » via
 * evaluate() (registre + décision + règle turn + contexte de combat
 * inCombat/isYourTurn). Toute la logique reste pure et pilotée par fixtures —
 * aucun runtime Foundry.
 */
describe("intégration — blocage hors de son tour", () => {
  beforeEach(() => {
    clearRules();
    registerRule(makeTurnRule({ getSetting: () => true }));
  });

  const NOOP = { hooks: { callAll() {} } };

  it("bloque en combat quand ce n'est pas le tour du token", () => {
    const ctx = makeContext({ inCombat: true, isYourTurn: false, override: false });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(false);
    expect(decision.reason.key).toBe("FQRESTRAIN.notifications.turnBlocked");
    expect(decision.rule).toBe(RULE_IDS.turn);
  });

  it("autorise en combat quand c'est le tour du token", () => {
    const ctx = makeContext({ inCombat: true, isYourTurn: true, override: false });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(true);
  });

  it("est un no-op hors combat", () => {
    const ctx = makeContext({ inCombat: false, isYourTurn: false, override: false });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(true);
  });

  it("est court-circuité par l'override (bypass MJ / token exempté)", () => {
    const ctx = makeContext({ inCombat: true, isYourTurn: false, override: true });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(true);
    expect(decision.rule).toBe("override");
  });

  it("turn l'emporte sur distance quand les deux bloqueraient (précédence)", () => {
    // Les deux règles actives ; hors du tour ET cumul > vitesse : turn doit gagner.
    registerRule(makeDistanceRule({ getSetting: () => true }));
    const ctx = makeContext({
      inCombat: true,
      isYourTurn: false,
      speed: 30,
      grid: makeGrid({ cost: 999 }),
      override: false,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(false);
    expect(decision.rule).toBe(RULE_IDS.turn);
  });
});
