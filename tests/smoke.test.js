import { describe, expect, it } from "vitest";
import { MODULE_ID } from "../src/constants.js";
import { makeContext } from "./fixtures/movement.js";

describe("harnais vitest (smoke)", () => {
  it("expose le bon MODULE_ID", () => {
    expect(MODULE_ID).toBe("fq-restrain-movement");
  });

  it("makeContext() fournit un grid.measurePath mockable", () => {
    const ctx = makeContext();
    expect(typeof ctx.grid.measurePath([]).spaces).toBe("number");
  });
});
