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
