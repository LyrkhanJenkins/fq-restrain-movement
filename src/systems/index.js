import { registerSystemAdapter, setFallbackAdapter } from "./registry.js";
import { makeDnd5eAdapter } from "./dnd5e.js";
import { makePf2eAdapter } from "./pf2e.js";
import { makeGenericAdapter } from "./generic.js";

export {
  getSystemAdapter,
  registerSystemAdapter,
  resolveSystemAdapter,
  setFallbackAdapter,
  clearSystemAdapters,
} from "./registry.js";

/**
 * Enregistre les adaptateurs embarqués : dnd5e et pf2e en dédiés, générique en
 * repli pour tous les autres systèmes. Appelé une fois à l'init.
 *
 * Un module ou système tiers peut enregistrer le sien après coup via
 * `game.modules.get("fq-restrain-movement").api.registerSystemAdapter()` : le
 * dernier adaptateur déclarant le système courant gagne.
 */
export function registerBuiltinSystemAdapters() {
  registerSystemAdapter(makeDnd5eAdapter());
  registerSystemAdapter(makePf2eAdapter());
  setFallbackAdapter(makeGenericAdapter());
}
