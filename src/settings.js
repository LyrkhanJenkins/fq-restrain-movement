import { MODULE_ID, SETTINGS, KEYBINDINGS } from "./constants.js";

/**
 * État module-level de la touche de bypass maintenue.
 * Lu par le moteur via `isBypassHeld()` pour court-circuiter les règles tant
 * que la touche reste enfoncée.
 */
let bypassHeld = false;

/**
 * Indique si la touche de bypass est actuellement maintenue.
 * @returns {boolean}
 */
export function isBypassHeld() {
  return bypassHeld;
}

/**
 * Enregistre les réglages monde du module :
 * - `distanceEnabled` : active/désactive la règle de limite de vitesse de combat.
 * - `turnEnabled` : active/désactive le blocage du déplacement hors de son tour.
 * - `gmNotRestrained` : le MJ n'est pas soumis aux restrictions.
 * - `takeBackEnabled` : active/désactive le veto du retour en arrière (take-back).
 * - `takeBackGraceSeconds` : fenêtre de grâce (secondes) avant gel de la
 *   position engagée par le suivi de take-back. Défaut 0 (gel immédiat). Le
 *   plancher défensif (négatif/NaN -> 0) est assuré à la lecture dans
 *   `tracking.js`, aucune contrainte min/max codée côté Foundry.
 * Tous `scope: "world"` : seul le MJ peut les modifier.
 */
export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.distanceEnabled, {
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    name: "FQRESTRAIN.settings.distanceEnabled.name",
    hint: "FQRESTRAIN.settings.distanceEnabled.hint",
  });

  game.settings.register(MODULE_ID, SETTINGS.turnEnabled, {
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    name: "FQRESTRAIN.settings.turnEnabled.name",
    hint: "FQRESTRAIN.settings.turnEnabled.hint",
  });

  game.settings.register(MODULE_ID, SETTINGS.gmNotRestrained, {
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    name: "FQRESTRAIN.settings.gmNotRestrained.name",
    hint: "FQRESTRAIN.settings.gmNotRestrained.hint",
  });

  game.settings.register(MODULE_ID, SETTINGS.takeBackEnabled, {
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    name: "FQRESTRAIN.settings.takeBackEnabled.name",
    hint: "FQRESTRAIN.settings.takeBackEnabled.hint",
  });

  game.settings.register(MODULE_ID, SETTINGS.takeBackGraceSeconds, {
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    name: "FQRESTRAIN.settings.takeBackGraceSeconds.name",
    hint: "FQRESTRAIN.settings.takeBackGraceSeconds.hint",
  });
}

/**
 * Enregistre le keybinding de bypass : maintenu enfoncé, désactive les règles
 * le temps du déplacement. L'état pressé est exposé ici via `isBypassHeld`.
 * Touche par défaut : Alt gauche.
 */
export function registerKeybindings() {
  game.keybindings.register(MODULE_ID, KEYBINDINGS.bypass, {
    name: "FQRESTRAIN.keybindings.bypass.name",
    hint: "FQRESTRAIN.keybindings.bypass.hint",
    editable: [{ key: "AltLeft" }],
    onDown: () => {
      bypassHeld = true;
    },
    onUp: () => {
      bypassHeld = false;
    },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });
}
