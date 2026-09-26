import { describe, it, expect } from "vitest";
import { makeDnd5eAdapter } from "../../src/systems/dnd5e.js";
import { makePf2eAdapter } from "../../src/systems/pf2e.js";
import { makeGenericAdapter, readSpeedContainer } from "../../src/systems/generic.js";
import { getPath, readNumber } from "../../src/systems/read.js";
import { DEFAULT_SPEED_PATH } from "../../src/constants.js";

/**
 * Adaptateurs système : chacun sait où son système range les vitesses. Tous
 * rendent la même forme `{ speeds, units }`, ou `null` quand aucune donnée
 * n'est exploitable (la règle de distance devient alors un no-op).
 */

describe("systems / read", () => {
  it("descend un chemin pointé sans jamais lever", () => {
    expect(getPath({ a: { b: { c: 3 } } }, "a.b.c")).toBe(3);
    expect(getPath({ a: null }, "a.b.c")).toBeUndefined();
    expect(getPath(null, "a")).toBeUndefined();
    expect(getPath({ a: 1 }, "")).toBeUndefined();
  });

  it("lit une vitesse nombre, chaîne numérique ou objet enveloppant", () => {
    expect(readNumber(30)).toBe(30);
    expect(readNumber("30")).toBe(30);
    expect(readNumber({ distance: 9, unit: "m" })).toBe(9);
    expect(readNumber({ total: 25 })).toBe(25);
  });

  it("rend null pour ce qui n'est pas une vitesse", () => {
    expect(readNumber(undefined)).toBeNull();
    expect(readNumber(-5)).toBeNull();
    expect(readNumber("ft")).toBeNull();
    expect(readNumber({ hover: true })).toBeNull();
  });
});

describe("systems / adaptateur dnd5e", () => {
  const adapter = makeDnd5eAdapter({ getMovementTypes: () => ({ fly: { walkFallback: false } }) });

  it("déclare le système dnd5e", () => {
    expect(adapter.systems).toEqual(["dnd5e"]);
  });

  it("lit `movement.speeds` et l'unité de l'acteur", () => {
    const actor = {
      system: { attributes: { movement: { speeds: { walk: 30, fly: 60 }, units: "ft" } } },
    };

    expect(adapter.readSpeeds(actor)).toEqual({ speeds: { walk: 30, fly: 60 }, units: "ft" });
  });

  it("ignore la racine de `movement` (schéma dnd5e 5, retiré en dnd5e 7)", () => {
    const actor = { system: { attributes: { movement: { walk: 30 } } } };

    expect(adapter.readSpeeds(actor)).toBeNull();
  });

  it("rend null sans acteur", () => {
    expect(adapter.readSpeeds(null)).toBeNull();
  });
});

describe("systems / adaptateur pf2e", () => {
  const adapter = makePf2eAdapter({ getSpeedTypes: () => ({ fly: "PF2E.SpeedTypesFly" }) });

  it("lit la vitesse au sol et les autres modes de `otherSpeeds`", () => {
    const actor = {
      system: {
        attributes: {
          speed: {
            value: 25,
            total: 25,
            otherSpeeds: [
              { type: "fly", value: 30 },
              { type: "swim", value: 20 },
            ],
          },
        },
      },
    };

    expect(adapter.readSpeeds(actor)).toEqual({
      speeds: { walk: 25, fly: 30, swim: 20 },
      units: "ft",
    });
  });

  it("tolère l'absence de `otherSpeeds`", () => {
    const actor = { system: { attributes: { speed: { value: 25 } } } };

    expect(adapter.readSpeeds(actor)).toEqual({ speeds: { walk: 25 }, units: "ft" });
  });

  it("rend null quand aucune vitesse n'est lisible", () => {
    expect(adapter.readSpeeds({ system: { attributes: { speed: { otherSpeeds: [] } } } })).toBeNull();
    expect(adapter.readSpeeds({ system: { attributes: {} } })).toBeNull();
  });

  it("exige une vitesse dédiée pour voler et creuser, pas pour nager ni grimper", () => {
    const types = adapter.getMovementTypes();

    expect(types.fly.walkFallback).toBe(false);
    expect(types.burrow.walkFallback).toBe(false);
    expect(types.swim.walkFallback).toBe(true);
    expect(types.climb.walkFallback).toBe(true);
    expect(types.fly.label).toBe("PF2E.SpeedTypesFly");
  });
});

describe("systems / readSpeedContainer", () => {
  it("lit une carte par mode", () => {
    expect(readSpeedContainer({ walk: 30, fly: 60, units: "ft" })).toEqual({ walk: 30, fly: 60 });
  });

  it("lit des vitesses enveloppées (a5e, pf1)", () => {
    const container = { walk: { distance: 30 }, fly: { distance: 0 } };
    expect(readSpeedContainer(container)).toEqual({ walk: 30, fly: 0 });
  });

  it("accepte les alias de marche (`land`, `value`)", () => {
    expect(readSpeedContainer({ land: { total: 20 } })).toEqual({ walk: 20 });
    expect(readSpeedContainer({ value: 4 })).toEqual({ walk: 4 });
  });

  it("accepte un simple nombre comme vitesse de marche", () => {
    expect(readSpeedContainer(6)).toEqual({ walk: 6 });
  });

  it("rend null quand rien de numérique n'est lisible", () => {
    expect(readSpeedContainer({ units: "ft", hover: true })).toBeNull();
    expect(readSpeedContainer(undefined)).toBeNull();
  });
});

describe("systems / adaptateur générique", () => {
  const adapter = makeGenericAdapter({ getSpeedPath: () => "" });

  it("sonde la racine de `attributes.movement` (dnd5e 5, sw5e et dérivés)", () => {
    const actor = { system: { attributes: { movement: { walk: 30, fly: 0, units: "ft" } } } };

    expect(adapter.readSpeeds(actor)).toEqual({ speeds: { walk: 30, fly: 0 }, units: "ft" });
  });

  it("sonde `attributes.speed` par mode (pf1)", () => {
    const actor = {
      system: { attributes: { speed: { land: { total: 30 }, fly: { total: 60 } } } },
    };

    expect(adapter.readSpeeds(actor).speeds).toEqual({ walk: 30, fly: 60 });
  });

  it("sonde une vitesse unique (`details.move.value`)", () => {
    const actor = { system: { details: { move: { value: 4 } } } };

    expect(adapter.readSpeeds(actor).speeds).toEqual({ walk: 4 });
  });

  it("lit l'unité par mode quand le système la porte là (a5e)", () => {
    const actor = {
      system: { attributes: { movement: { walk: { distance: 9, unit: "meters" } } } },
    };

    expect(adapter.readSpeeds(actor)).toEqual({ speeds: { walk: 9 }, units: "meters" });
  });

  it("rend null quand aucun emplacement connu n'expose de vitesse", () => {
    expect(adapter.readSpeeds({ system: { traits: { size: "med" } } })).toBeNull();
    expect(adapter.readSpeeds(null)).toBeNull();
  });

  it("ne déclare aucun mode : tout retombe sur la marche (permissif)", () => {
    expect(adapter.getMovementTypes()).toEqual({});
  });

  it("suit le chemin configuré par le MJ en priorité", () => {
    const configured = makeGenericAdapter({ getSpeedPath: () => " system.maison.vitesses " });
    const actor = {
      system: { maison: { vitesses: { walk: 12 } }, attributes: { movement: { walk: 30 } } },
    };

    expect(configured.readSpeeds(actor).speeds).toEqual({ walk: 12 });
  });

  it("retombe sur le sondage quand le chemin configuré ne mène à rien, en avertissant une fois", () => {
    const warnings = [];
    const configured = makeGenericAdapter({
      getSpeedPath: () => "system.faute.de.frappe",
      warn: (message) => warnings.push(message),
    });
    const actor = { system: { attributes: { movement: { walk: 30 } } } };

    expect(configured.readSpeeds(actor).speeds).toEqual({ walk: 30 });
    expect(configured.readSpeeds(actor).speeds).toEqual({ walk: 30 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("system.faute.de.frappe");
  });

  // Le chemin dnd5e 6 est la valeur par défaut du réglage : il rate dans les
  // autres systèmes, sans jamais devoir y désactiver la détection ni bavarder
  // en console.
  it("laisse le sondage opérer sous le chemin par défaut, sans avertir", () => {
    const warnings = [];
    const configured = makeGenericAdapter({
      getSpeedPath: () => DEFAULT_SPEED_PATH,
      warn: (message) => warnings.push(message),
    });
    const pf1 = { system: { attributes: { speed: { land: { total: 30 } } } } };

    expect(configured.readSpeeds(pf1).speeds).toEqual({ walk: 30 });
    expect(warnings).toHaveLength(0);
  });

  it("lit les vitesses dnd5e 6 quand le chemin par défaut aboutit", () => {
    const configured = makeGenericAdapter({ getSpeedPath: () => DEFAULT_SPEED_PATH });
    const actor = {
      system: { attributes: { movement: { speeds: { walk: 30, fly: 60 }, units: "ft" } } },
    };

    expect(configured.readSpeeds(actor)).toEqual({ speeds: { walk: 30, fly: 60 }, units: "ft" });
  });
});
