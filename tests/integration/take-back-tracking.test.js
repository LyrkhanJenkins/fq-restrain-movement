import { describe, it, expect, beforeEach } from "vitest";
import {
  getEngagedPosition,
  engageAtTurnStart,
  resetEngagedPosition,
  clearTracking,
} from "../../src/tracking.js";

/**
 * Vérifie de bout en bout le cycle de vie complet du modèle de reset de la
 * position engagée — horloge et réglage de grâce INJECTÉS, aucun runtime
 * Foundry ni timer réel. Le suivi ne vaut qu'en combat : la position engagée
 * est posée au début du tour et oubliée au changement de tour.
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

  it("gèle immédiatement la position de début de tour quand la grâce est nulle", () => {
    const deps = makeDeps({ now: () => 1000, grace: 0 });

    engageAtTurnStart({ id: "t1", x: 100, y: 0 }, deps);

    expect(getEngagedPosition("t1", deps)).toEqual({ x: 100, y: 0 });
  });

  it("ouvre une fenêtre de grâce (horloge injectée) puis fige la position à l'expiration", () => {
    let now = 1000;
    const deps = { now: () => now, getSetting: () => 10 };

    engageAtTurnStart({ id: "t1", x: 100, y: 0 }, deps);

    // Pendant la grâce (now=1000, freeze à 1000+10000=11000) : rien n'est opposable.
    expect(getEngagedPosition("t1", deps)).toBeNull();

    // À l'expiration exacte (now=11000) : la position est figée/opposable.
    now = 11000;
    expect(getEngagedPosition("t1", deps)).toEqual({ x: 100, y: 0 });
  });

  it("tant que la grâce est ouverte, aucune position n'est opposable (reprise libre)", () => {
    let now = 0;
    const deps = { now: () => now, getSetting: () => 5 };

    engageAtTurnStart({ id: "t1", x: 0, y: 0 }, deps);

    now = 4999;
    expect(getEngagedPosition("t1", deps)).toBeNull();
  });

  it("engage la position de début de tour puis reset au changement de tour", () => {
    const deps = makeDeps({ now: () => 1000, grace: 0 });

    engageAtTurnStart({ id: "t2", x: 50, y: 50 }, deps);
    expect(getEngagedPosition("t2", deps)).toEqual({ x: 50, y: 50 });

    resetEngagedPosition("t2");
    expect(getEngagedPosition("t2", deps)).toBeNull();
  });
});
