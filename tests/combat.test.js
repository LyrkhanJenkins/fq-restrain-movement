import { describe, it, expect } from "vitest";
import {
  getInCombat,
  getIsYourTurn,
  getSpeed,
  readCombatContext,
} from "../src/combat.js";

/**
 * Tests des lecteurs de contexte de combat sans runtime Foundry : toutes les
 * entrées Foundry passent par un `deps` factice (`getCombat`), aucun accès à
 * `game.*` réel.
 */

/** Construit un `deps` factice dont `getCombat()` retourne un faux combat. */
function makeDeps(combat = null) {
  return { getCombat: () => combat };
}

/** Construit un token factice portant un `id` et une vitesse dnd5e optionnelle. */
function makeToken({ id = "t1", walk } = {}) {
  const token = { id };
  if (walk !== undefined) {
    token.actor = { system: { attributes: { movement: { walk } } } };
  }
  return token;
}

describe("combat / getInCombat", () => {
  it("retourne true si le combat est démarré", () => {
    expect(getInCombat(makeDeps({ started: true }))).toBe(true);
  });

  it("retourne false si le combat n'est pas démarré", () => {
    expect(getInCombat(makeDeps({ started: false }))).toBe(false);
  });

  it("retourne false si aucun combat n'est actif", () => {
    expect(getInCombat(makeDeps(null))).toBe(false);
  });
});

describe("combat / getIsYourTurn", () => {
  it("retourne true si le combattant courant correspond au token (tokenId)", () => {
    const deps = makeDeps({ combatant: { tokenId: "t1" } });
    expect(getIsYourTurn(makeToken({ id: "t1" }), deps)).toBe(true);
  });

  it("retourne true si le combattant courant correspond au token (token.id)", () => {
    const deps = makeDeps({ combatant: { token: { id: "t1" } } });
    expect(getIsYourTurn(makeToken({ id: "t1" }), deps)).toBe(true);
  });

  it("retourne false si le combattant courant est un autre token", () => {
    const deps = makeDeps({ combatant: { tokenId: "other" } });
    expect(getIsYourTurn(makeToken({ id: "t1" }), deps)).toBe(false);
  });

  it("retourne false s'il n'y a pas de combattant courant", () => {
    const deps = makeDeps({ combatant: null });
    expect(getIsYourTurn(makeToken({ id: "t1" }), deps)).toBe(false);
  });

  it("retourne false s'il n'y a pas de combat", () => {
    expect(getIsYourTurn(makeToken({ id: "t1" }), makeDeps(null))).toBe(false);
  });
});

describe("combat / getSpeed", () => {
  it("retourne la vitesse de marche dnd5e quand elle est présente", () => {
    expect(getSpeed(makeToken({ walk: 30 }))).toBe(30);
  });

  it("retourne undefined si l'acteur est absent (défensif, pas de crash)", () => {
    expect(getSpeed(makeToken({}))).toBeUndefined();
  });

  it("retourne undefined si le tokenDocument est absent (défensif)", () => {
    expect(getSpeed(undefined)).toBeUndefined();
  });
});

describe("combat / readCombatContext", () => {
  it("agrège inCombat/isYourTurn/speed via un deps mocké", () => {
    const deps = makeDeps({ started: true, combatant: { tokenId: "t1" } });
    const token = makeToken({ id: "t1", walk: 30 });

    expect(readCombatContext(token, deps)).toEqual({
      inCombat: true,
      isYourTurn: true,
      speed: 30,
    });
  });

  it("reflète l'état dégradé : hors combat, pas de tour, vitesse inconnue", () => {
    const deps = makeDeps(null);
    const token = makeToken({ id: "t1" });

    expect(readCombatContext(token, deps)).toEqual({
      inCombat: false,
      isYourTurn: false,
      speed: undefined,
    });
  });
});
