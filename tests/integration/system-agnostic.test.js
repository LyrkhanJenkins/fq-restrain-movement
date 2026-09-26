import { describe, it, expect, beforeEach } from "vitest";
import { evaluate } from "../../src/engine/decision.js";
import { registerRule, clearRules } from "../../src/engine/registry.js";
import { makeDistanceRule } from "../../src/rules/distance.js";
import { makeTurnRule } from "../../src/rules/turn.js";
import { readMovementContext } from "../../src/movement.js";
import { makeGenericAdapter } from "../../src/systems/generic.js";
import { makeContext, makeGrid } from "../fixtures/movement.js";
import { RULE_IDS } from "../../src/constants.js";

/**
 * Vérifie de bout en bout qu'un système SANS adaptateur dédié fonctionne :
 * l'adaptateur générique localise les vitesses, la limite de vitesse s'applique
 * dans l'unité de la scène, et quand aucune vitesse n'est localisable la règle
 * de distance s'efface sans emporter les autres restrictions.
 */

/** `deps` de `readMovementContext` pour un système quelconque, scène en mètres. */
function systemDeps({ gridUnits = "m" } = {}) {
  const adapter = makeGenericAdapter({ getSpeedPath: () => "" });

  return {
    getActionConfig: () => undefined,
    getActionIds: () => ["walk", "fly"],
    getMovementTypeConfig: (action) => adapter.getMovementTypes()[action],
    readSpeeds: (actor) => adapter.readSpeeds(actor),
    getGridUnits: () => gridUnits,
    localize: (key) => key,
  };
}

/** Jeton d'un système maison : vitesse unique de 9 (mètres), comme la scène. */
function homebrewToken() {
  return {
    id: "t1",
    actor: { system: { attributes: { speed: { value: 9 } } } },
  };
}

const NOOP = { hooks: { callAll() {} } };

describe("intégration — système sans adaptateur dédié", () => {
  beforeEach(() => {
    clearRules();
    registerRule(makeTurnRule({ getSetting: () => true }));
    registerRule(makeDistanceRule({ getSetting: () => true }));
  });

  it("applique la limite de vitesse trouvée par l'adaptateur générique", () => {
    const movement = readMovementContext(homebrewToken(), {}, systemDeps());
    const ctx = makeContext({
      inCombat: true,
      isYourTurn: true,
      override: false,
      grid: makeGrid({ cost: 12 }),
      ...movement,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(false);
    expect(decision.rule).toBe(RULE_IDS.distance);
    // Message dans l'unité de la scène, pas en pieds.
    expect(decision.reason.data.speed).toBe("9 m");
  });

  it("laisse passer un déplacement dans la limite", () => {
    const movement = readMovementContext(homebrewToken(), {}, systemDeps());
    const ctx = makeContext({
      inCombat: true,
      isYourTurn: true,
      override: false,
      grid: makeGrid({ cost: 9 }),
      ...movement,
    });

    expect(evaluate(ctx, NOOP).allowed).toBe(true);
  });

  it("n'impose aucune limite quand les vitesses du système restent introuvables", () => {
    const exotique = { id: "t1", actor: { system: { deplacement: { pas: 4 } } } };
    const movement = readMovementContext(exotique, {}, systemDeps());
    const ctx = makeContext({
      inCombat: true,
      isYourTurn: true,
      override: false,
      grid: makeGrid({ cost: 999 }),
      ...movement,
    });

    expect(evaluate(ctx, NOOP).allowed).toBe(true);
  });

  it("garde le blocage hors de son tour même sans vitesse connue", () => {
    const exotique = { id: "t1", actor: { system: {} } };
    const movement = readMovementContext(exotique, {}, systemDeps());
    const ctx = makeContext({
      inCombat: true,
      isYourTurn: false,
      override: false,
      grid: makeGrid({ cost: 5 }),
      ...movement,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(false);
    expect(decision.rule).toBe(RULE_IDS.turn);
  });
});
