import { MODULE_ID, HOOK_EVALUATE, RULE_IDS } from "./constants.js";
import { registerInterception } from "./interception.js";
import { registerSettings, registerKeybindings } from "./settings.js";
import { registerRule } from "./engine/registry.js";
import { evaluate } from "./engine/decision.js";
import { makeDistanceRule } from "./rules/distance.js";
import { makeTurnRule } from "./rules/turn.js";
import { makeTakeBackRule } from "./rules/take-back.js";
import { registerTracking } from "./tracking.js";
import {
  getSystemAdapter,
  registerBuiltinSystemAdapters,
  registerSystemAdapter,
} from "./systems/index.js";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init fq-restrain-movement`);
  registerSettings();
  registerKeybindings();
  // Avant les règles : la règle de distance lit les vitesses via l'adaptateur
  // du système courant.
  registerBuiltinSystemAdapters();
  registerRule(makeDistanceRule());
  registerRule(makeTurnRule());
  registerRule(makeTakeBackRule());
  registerTracking();
  registerInterception();
});

/**
 * API publique du module : expose `evaluate` et `HOOK_EVALUATE` pour permettre
 * à du code tiers de s'accrocher au point d'extension
 * `fq-restrain-movement.evaluate`, `registerRule`/`RULE_IDS` pour enregistrer
 * de futures règles, et `registerSystemAdapter`/`getSystemAdapter` pour
 * brancher les vitesses d'un système non couvert par les adaptateurs
 * embarqués.
 */
Hooks.once("setup", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      evaluate,
      registerRule,
      registerSystemAdapter,
      getSystemAdapter,
      HOOK_EVALUATE,
      RULE_IDS,
    };
  }
});
