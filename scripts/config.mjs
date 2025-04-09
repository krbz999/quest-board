/** @import * as TYPES from "./types.mjs" */

/**
 * The quest types.
 * @enum {TYPES.QuestTypeConfig}
 */
export const QUEST_TYPES = {
  major: {
    label: "QUESTBOARD.QUESTTYPES.Major.label",
    labelPl: "QUESTBOARD.QUESTTYPES.Major.labelPl",
    priority: 3,
  },
  side: {
    label: "QUESTBOARD.QUESTTYPES.Side.label",
    labelPl: "QUESTBOARD.QUESTTYPES.Side.labelPl",
    priority: 2,
  },
  minor: {
    label: "QUESTBOARD.QUESTTYPES.Minor.label",
    labelPl: "QUESTBOARD.QUESTTYPES.Minor.labelPl",
    priority: 1,
  },
};
dnd5e.utils.preLocalize("QUEST_TYPES", { keys: ["label", "labelPl"] });
