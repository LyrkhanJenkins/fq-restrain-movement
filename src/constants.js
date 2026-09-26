export const MODULE_ID = "fq-restrain-movement";

export const SETTINGS = {
  distanceEnabled: "distanceEnabled",
  turnEnabled: "turnEnabled",
  gmNotRestrained: "gmNotRestrained",
  takeBackEnabled: "takeBackEnabled",
  takeBackGraceSeconds: "takeBackGraceSeconds",
  speedPath: "speedPath",
};

export const FLAGS = {
  exempt: "exempt",
  distanceLimit: "distanceLimit",
};

export const HOOK_EVALUATE = "fq-restrain-movement.evaluate";

/**
 * Valeur par défaut du réglage `speedPath` : l'emplacement des vitesses en
 * dnd5e 6 (`actor.system.attributes.movement.speeds`), qui sert d'exemple de
 * format autant que de valeur utile.
 *
 * Elle n'a d'effet que dans les systèmes servis par l'adaptateur générique :
 * dnd5e et pf2e ont leur adaptateur dédié, qui ignore ce réglage. Dans un
 * système où ce chemin ne mène à rien, l'adaptateur générique reprend son
 * sondage automatique — le défaut ne désactive donc aucune détection.
 */
export const DEFAULT_SPEED_PATH = "system.attributes.movement.speeds";

/** Action de déplacement par défaut quand aucune n'est portée par l'update. */
export const DEFAULT_MOVEMENT_ACTION = "walk";

/**
 * Actions dont le plafond retombe explicitement sur la vitesse de marche, en
 * complément de l'indicateur `walkFallback` rendu par l'adaptateur système :
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
