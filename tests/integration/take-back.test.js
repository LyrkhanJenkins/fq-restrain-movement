import { describe, it, expect, beforeEach } from "vitest";
import { evaluate } from "../../src/engine/decision.js";
import { registerRule, clearRules } from "../../src/engine/registry.js";
import { makeTakeBackRule } from "../../src/rules/take-back.js";
import { makeDistanceRule } from "../../src/rules/distance.js";
import { makeContext, makeMeasuringGrid } from "../fixtures/movement.js";
import { RULE_IDS } from "../../src/constants.js";

/**
 * Vérifie de bout en bout le chemin complet « veto du retour en arrière » via
 * evaluate() (registre + décision + règle take-back + position engagée injectée
 * dans le contexte). Toute la logique reste pure et pilotée par fixtures —
 * aucun runtime Foundry. Utilise `makeMeasuringGrid()` (distance euclidienne
 * réelle entre premier/dernier waypoint) pour que les deux mesures
 * [from,engaged] / [to,engaged] diffèrent selon les coordonnées passées.
 */
describe("intégration — veto du retour en arrière", () => {
  beforeEach(() => {
    clearRules();
    registerRule(makeTakeBackRule({ getSetting: () => true }));
  });

  const NOOP = { hooks: { callAll() {} } };

  it("bloque un déplacement qui réduit strictement la distance à la position engagée", () => {
    const ctx = makeContext({
      engagedPosition: { x: 0, y: 0 },
      from: { x: 100, y: 0 },
      to: { x: 40, y: 0 },
      grid: makeMeasuringGrid(),
      override: false,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(false);
    expect(decision.reason.key).toBe("FQRESTRAIN.notifications.takeBackBlocked");
    expect(decision.rule).toBe("take-back");
  });

  it("autorise un déplacement qui éloigne de la position engagée", () => {
    const ctx = makeContext({
      engagedPosition: { x: 0, y: 0 },
      from: { x: 100, y: 0 },
      to: { x: 160, y: 0 },
      grid: makeMeasuringGrid(),
      override: false,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(true);
  });

  it("autorise un déplacement latéral (distance égale ou supérieure)", () => {
    const ctx = makeContext({
      engagedPosition: { x: 0, y: 0 },
      from: { x: 100, y: 0 },
      to: { x: 100, y: 60 },
      grid: makeMeasuringGrid(),
      override: false,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(true);
  });

  it("est un no-op si le token n'est pas encore engagé", () => {
    const ctx = makeContext({
      engagedPosition: null,
      from: { x: 100, y: 0 },
      to: { x: 40, y: 0 },
      grid: makeMeasuringGrid(),
      override: false,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(true);
  });

  it("est court-circuité par l'override (bypass MJ / token exempté)", () => {
    const ctx = makeContext({
      engagedPosition: { x: 0, y: 0 },
      from: { x: 100, y: 0 },
      to: { x: 40, y: 0 },
      grid: makeMeasuringGrid(),
      override: true,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(true);
    expect(decision.rule).toBe("override");
  });

  it("take-back l'emporte sur distance quand les deux bloqueraient (précédence)", () => {
    // Les deux règles actives ; retour ET trajet supérieur à la vitesse :
    // take-back doit gagner (précédence take-back > distance).
    registerRule(makeDistanceRule({ getSetting: () => true }));
    const ctx = makeContext({
      inCombat: true,
      isYourTurn: true,
      speed: 5,
      from: { x: 100, y: 0 },
      to: { x: 40, y: 0 },
      engagedPosition: { x: 0, y: 0 },
      grid: makeMeasuringGrid(),
      override: false,
    });

    const decision = evaluate(ctx, NOOP);

    expect(decision.allowed).toBe(false);
    expect(decision.rule).toBe(RULE_IDS.takeBack);
  });
});
