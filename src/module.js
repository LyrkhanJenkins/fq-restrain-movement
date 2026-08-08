import { MODULE_ID, HOOK_EVALUATE, RULE_IDS } from "./constants.js";
import { registerInterception } from "./interception.js";
import { registerSettings, registerKeybindings } from "./settings.js";
import { registerRule } from "./engine/registry.js";
import { evaluate } from "./engine/decision.js";
import { makeDistanceRule } from "./rules/distance.js";
import { makeTurnRule } from "./rules/turn.js";
import { makeTakeBackRule } from "./rules/take-back.js";
import { registerTracking } from "./tracking.js";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init fq-restrain-movement`);
  registerSettings();
  registerKeybindings();
  registerRule(makeDistanceRule());
  registerRule(makeTurnRule());
  registerRule(makeTakeBackRule());
  registerTracking();
  registerInterception();
});

/**
 * API publique du module : expose `evaluate` et `HOOK_EVALUATE` pour permettre
 * à du code tiers de s'accrocher au point d'extension
 * `fq-restrain-movement.evaluate`, ainsi que `registerRule`/`RULE_IDS` pour
 * enregistrer de futures règles.
 */
Hooks.once("setup", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = { evaluate, registerRule, HOOK_EVALUATE, RULE_IDS };
  }
});
