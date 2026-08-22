export const MODULE_ID = "fq-restrain-movement";

export const SETTINGS = {
  distanceEnabled: "distanceEnabled",
  turnEnabled: "turnEnabled",
  gmNotRestrained: "gmNotRestrained",
  takeBackEnabled: "takeBackEnabled",
  takeBackGraceSeconds: "takeBackGraceSeconds",
};

export const FLAGS = {
  exempt: "exempt",
  distanceLimit: "distanceLimit",
};

export const HOOK_EVALUATE = "fq-restrain-movement.evaluate";

/** Action de déplacement par défaut quand aucune n'est portée par l'update. */
export const DEFAULT_MOVEMENT_ACTION = "walk";

/**
 * Actions dont le plafond retombe explicitement sur la vitesse de marche, en
 * complément de l'indicateur `walkFallback` de `CONFIG.DND5E.movementTypes` :
 * la marche elle-même, et le saut (dnd5e stocke sous `movement.jump` une
 * distance de saut, pas une vitesse — elle ne doit pas servir de plafond).
 */
export const WALK_FALLBACK_ACTIONS = ["walk", "jump"];

export const KEYBINDINGS = {
  bypass: "bypass",
};

export const RULE_IDS = {
  lock: "lock",
  turn: "turn",
  takeBack: "take-back",
  distance: "distance",
};

export const PRECEDENCE = ["lock", "turn", "take-back", "distance"];
