import { describe, it, expect, beforeEach } from "vitest";
import {
  getEngagedPosition,
  updateEngagedPosition,
  engageAtTurnStart,
  resetEngagedPosition,
  clearTracking,
} from "../../src/tracking.js";

/**
 * Vérifie de bout en bout le cycle de vie complet du modèle de reset de la
 * position engagée — horloge et réglage de grâce INJECTÉS, aucun runtime
 * Foundry ni timer réel.
 */
describe("intégration — cycle de vie du modèle de reset", () => {
  beforeEach(() => {
    clearTracking();
  });

  function makeDeps({ now = () => 0, grace = 0 } = {}) {
    return {
      now,
      getSetting: () => grace,
    };
  }

  it("gèle immédiatement hors combat quand la grâce est nulle", () => {
    const deps = makeDeps({ now: () => 1000, grace: 0 });

    updateEngagedPosition(
      { tokenDocument: { id: "t1" }, from: { x: 100, y: 0 }, inCombat: false },
      deps,
    );

    expect(getEngagedPosition("t1", deps)).toEqual({ x: 100, y: 0 });
  });

  it("ouvre une fenêtre de grâce (horloge injectée) puis fige la position à l'expiration", () => {
    let now = 1000;
    const deps = { now: () => now, getSetting: () => 10 };

    updateEngagedPosition(
      { tokenDocument: { id: "t1" }, from: { x: 100, y: 0 }, inCombat: false },
      deps,
    );

    // Pendant la grâce (now=1000, freeze à 1000+10000=11000) : rien n'est opposable.
    expect(getEngagedPosition("t1", deps)).toBeNull();

    // À l'expiration exacte (now=11000) : la position est figée/opposable.
    now = 11000;
    expect(getEngagedPosition("t1", deps)).toEqual({ x: 100, y: 0 });
  });

  it("tant que la grâce est ouverte, aucune position n'est opposable (reprise libre)", () => {
    let now = 0;
    const deps = { now: () => now, getSetting: () => 5 };

    updateEngagedPosition(
      { tokenDocument: { id: "t1" }, from: { x: 0, y: 0 }, inCombat: false },
      deps,
    );

    now = 4999;
    expect(getEngagedPosition("t1", deps)).toBeNull();
  });

  it("est un no-op en combat : ne modifie pas l'entrée posée par engageAtTurnStart", () => {
    const deps = makeDeps({ now: () => 1000, grace: 0 });

    engageAtTurnStart({ id: "t1", x: 50, y: 50 }, deps);
    expect(getEngagedPosition("t1", deps)).toEqual({ x: 50, y: 50 });

    updateEngagedPosition(
      { tokenDocument: { id: "t1" }, from: { x: 999, y: 999 }, inCombat: true },
      deps,
    );

    expect(getEngagedPosition("t1", deps)).toEqual({ x: 50, y: 50 });
  });

  it("engage la position de début de tour (gel immédiat) puis reset au changement de tour", () => {
    const deps = makeDeps({ now: () => 1000, grace: 0 });

    engageAtTurnStart({ id: "t2", x: 50, y: 50 }, deps);
    expect(getEngagedPosition("t2", deps)).toEqual({ x: 50, y: 50 });

    resetEngagedPosition("t2");
    expect(getEngagedPosition("t2", deps)).toBeNull();
  });
});
