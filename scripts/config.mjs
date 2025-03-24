/**
 * @typedef {object} QuestTypeConfig
 * @property {string} label         The human-readable label.
 * @property {string} labelPl       The human-readable pluralized label.
 * @property {number} priority      The priority of the quest type, with lowest being highest priority.
 */

/**
 * The quest types.
 * @enum {QuestTypeConfig}
 */
export const QUEST_TYPES = {
  major: {
    label: "QUESTBOARD.QUESTTYPES.Major.label",
    labelPl: "QUESTBOARD.QUESTTYPES.Major.labelPl",
    priority: 1,
  },
  side: {
    label: "QUESTBOARD.QUESTTYPES.Side.label",
    labelPl: "QUESTBOARD.QUESTTYPES.Side.labelPl",
    priority: 2,
  },
  minor: {
    label: "QUESTBOARD.QUESTTYPES.Minor.label",
    labelPl: "QUESTBOARD.QUESTTYPES.Minor.labelPl",
    priority: 3,
  },
};
dnd5e.utils.preLocalize("QUEST_TYPES", { keys: ["label", "labelPl"] });
