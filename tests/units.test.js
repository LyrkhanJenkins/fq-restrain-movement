import { describe, it, expect } from "vitest";
import { convertDistance, convertSpeeds, formatSpeed, normalizeUnits } from "../src/units.js";

/**
 * Conversion et mise en forme des distances : la vitesse vient de la fiche
 * (unité du système), la mesure de trajet de la scène (unité de la scène).
 * La conversion n'a lieu que lorsque les deux unités sont connues et diffèrent.
 */

describe("units / normalizeUnits", () => {
  it("met en minuscules et retire la ponctuation de fin", () => {
    expect(normalizeUnits("Ft.")).toBe("ft");
    expect(normalizeUnits("  M ")).toBe("m");
  });

  it("retourne null pour une entrée inexploitable", () => {
    expect(normalizeUnits("")).toBeNull();
    expect(normalizeUnits(undefined)).toBeNull();
    expect(normalizeUnits(5)).toBeNull();
  });
});

describe("units / convertDistance", () => {
  it("convertit des mètres en pieds", () => {
    expect(convertDistance(9, "m", "ft")).toBeCloseTo(29.528, 2);
  });

  it("convertit des pieds en mètres", () => {
    expect(convertDistance(30, "ft", "m")).toBeCloseTo(9.144, 3);
  });

  it("ne touche à rien quand les unités sont équivalentes", () => {
    expect(convertDistance(30, "ft", "feet")).toBe(30);
  });

  it("ne touche à rien quand une unité est inconnue (cases, libellé traduit)", () => {
    expect(convertDistance(30, "ft", "cases")).toBe(30);
    expect(convertDistance(30, undefined, "m")).toBe(30);
  });

  it("laisse passer une valeur non numérique", () => {
    expect(convertDistance(null, "m", "ft")).toBeNull();
  });
});

describe("units / convertSpeeds", () => {
  it("convertit chaque vitesse numérique et conserve les inconnues", () => {
    const converted = convertSpeeds({ walk: 9, fly: 18, blink: null }, "m", "ft");

    expect(converted.walk).toBeCloseTo(29.528, 2);
    expect(converted.fly).toBeCloseTo(59.055, 2);
    expect(converted.blink).toBeNull();
  });

  it("retourne la carte telle quelle quand aucune conversion n'est possible", () => {
    const speeds = { walk: 30 };
    expect(convertSpeeds(speeds, "ft", "ft")).toBe(speeds);
    expect(convertSpeeds(speeds, "ft", "cases")).toBe(speeds);
  });

  it("retourne null sans carte de vitesses", () => {
    expect(convertSpeeds(null, "m", "ft")).toBeNull();
  });
});

describe("units / formatSpeed", () => {
  it("suffixe l'unité de la scène", () => {
    expect(formatSpeed(30, "ft")).toBe("30 ft");
    expect(formatSpeed(9, "m")).toBe("9 m");
  });

  it("arrondit au centième les valeurs converties", () => {
    expect(formatSpeed(29.527559, "ft")).toBe("29.53 ft");
  });

  it("omet l'unité quand la scène n'en expose pas", () => {
    expect(formatSpeed(30, undefined)).toBe("30");
    expect(formatSpeed(30, "  ")).toBe("30");
  });
});
