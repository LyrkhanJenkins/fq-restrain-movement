import { describe, it, expect } from "vitest";
import { makeDistanceRule } from "../../src/rules/distance.js";
import { makeContext, makeGrid, makeSegmentedMeasure, makeActionPath } from "../fixtures/movement.js";
import { SETTINGS } from "../../src/constants.js";

/**
 * Limite de vitesse sensible au mode de déplacement (dnd5e) : vol, terrier,
 * escalade/nage à repli marche, téléportation, et bascule de vitesse quand un
 * même tour mélange plusieurs modes. Aucune dépendance à Foundry : les
 * plafonds arrivent par `context.speedByAction`, la mesure par
 * `context.measurePath`.
 */

function makeDeps() {
  return {
    getSetting: (key) => {
      if (key === SETTINGS.distanceEnabled) return true;
      throw new Error(`getSetting: clé inattendue "${key}"`);
    },
  };
}

/** Plafonds par action d'un acteur « vitesse 30, vol 60, terrier 0 ». */
function speeds(overrides = {}) {
  return { walk: 30, climb: 30, swim: 30, fly: 60, burrow: 0, blink: null, ...overrides };
}

/** Contexte « en combat, à son tour », mode et plafonds surchargeables. */
function combatCtx(overrides = {}) {
  return makeContext({
    inCombat: true,
    isYourTurn: true,
    speed: 30,
    speedByAction: speeds(),
    actionLabels: { walk: "Vitesse", fly: "Vol", burrow: "Creusement", climb: "Escalade" },
    movementAction: "walk",
    ...overrides,
  });
}

describe("règle distance — plafond par mode de déplacement", () => {
  it("autorise 60 pieds de vol avec une vitesse de vol de 60", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ movementAction: "fly", grid: makeGrid({ cost: 60 }) });

    expect(rule.evaluate(context).allowed).toBe(true);
  });

  it("bloque 65 pieds de vol avec une vitesse de vol de 60, en nommant le mode", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ movementAction: "fly", grid: makeGrid({ cost: 65 }) });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(false);
    expect(result.reason).toEqual({
      key: "FQRESTRAIN.notifications.distanceBlockedAction",
      data: { speed: 60, action: "Vol" },
    });
  });

  it("bloque tout déplacement dans un mode sans vitesse (terrier à 0)", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ movementAction: "burrow", grid: makeGrid({ cost: 5 }) });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(false);
    expect(result.reason).toEqual({
      key: "FQRESTRAIN.notifications.actionSpeedMissing",
      data: { action: "Creusement" },
    });
  });

  it("laisse passer la téléportation (plafond null)", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ movementAction: "blink", grid: makeGrid({ cost: 999 }) });

    expect(rule.evaluate(context).allowed).toBe(true);
  });

  it("garde le message sans mode pour la marche", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({ grid: makeGrid({ cost: 35 }) });

    expect(rule.evaluate(context).reason).toEqual({
      key: "FQRESTRAIN.notifications.distanceBlocked",
      data: { speed: 30 },
    });
  });

  it("utilise context.measurePath quand il est exposé, plutôt que la grille", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({
      movementAction: "fly",
      grid: makeGrid({ cost: 5 }),
      measurePath: () => ({ cost: 65 }),
    });

    expect(rule.evaluate(context).allowed).toBe(false);
    expect(context.distance).toBe(65);
  });
});

describe("règle distance — bascule de vitesse entre modes sur un même tour", () => {
  it("autorise 10 pieds à pied puis 40 pieds de vol dans une vitesse de vol de 60", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({
      movementAction: "fly",
      path: makeActionPath(["walk", "fly"]),
      measurePath: makeSegmentedMeasure([10, 40]),
    });

    expect(rule.evaluate(context).allowed).toBe(true);
  });

  it("bloque 40 pieds de vol puis un pas à pied : le cumul dépasse la marche", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({
      movementAction: "walk",
      path: makeActionPath(["fly", "walk"]),
      measurePath: makeSegmentedMeasure([40, 5]),
    });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(false);
    expect(result.reason).toEqual({
      key: "FQRESTRAIN.notifications.distanceBlocked",
      data: { speed: 30 },
    });
  });

  it("bloque au segment fautif quand le cumul dépasse le plafond du mode utilisé", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({
      movementAction: "fly",
      path: makeActionPath(["walk", "fly"]),
      measurePath: makeSegmentedMeasure([25, 40]),
    });

    const result = rule.evaluate(context);

    expect(result.allowed).toBe(false);
    expect(result.reason.data).toEqual({ speed: 60, action: "Vol" });
  });

  it("ne plafonne pas les segments de téléportation", () => {
    const rule = makeDistanceRule(makeDeps());
    // Foundry ne mesure pas les segments téléportés (`measure: false`) : leur
    // coût est nul. La règle ne leur applique de toute façon aucun plafond.
    const context = combatCtx({
      movementAction: "walk",
      path: makeActionPath(["blink", "walk"]),
      measurePath: makeSegmentedMeasure([0, 25]),
    });

    expect(rule.evaluate(context).allowed).toBe(true);
  });

  it("retombe sur le cumul total quand la mesure n'expose pas les cumuls par waypoint", () => {
    const rule = makeDistanceRule(makeDeps());
    const context = combatCtx({
      movementAction: "fly",
      path: makeActionPath(["walk", "fly"]),
      measurePath: () => ({ cost: 65 }),
    });

    expect(rule.evaluate(context).allowed).toBe(false);
  });
});
