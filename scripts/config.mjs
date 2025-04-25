/**
 * The quest types.
 * @enum {import("./types.mjs").QuestTypeConfig}
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

/* -------------------------------------------------- */

/**
 * Properties available for a Relation.
 * @enum {import("./types.mjs").RelationPropertyConfig}
 */
export const RELATION_PROPERTIES = {
  dead: {
    label: "QUESTBOARD.RELATION.PROPERTIES.dead",
  },
};
Object.defineProperty(RELATION_PROPERTIES, "toOptions", {
  get: function() {return Object.entries(this).map(([k, v]) => ({ value: k, label: v.label })); },
  enumerable: false,
});
dnd5e.utils.preLocalize("RELATION_PROPERTIES", { keys: ["label"] });

/* -------------------------------------------------- */

/**
 * Properties available for a Location.
 * @enum {import("./types.mjs").LocationPropertyConfig}
 */
export const LOCATION_PROPERTIES = {
  defunct: {
    label: "QUESTBOARD.LOCATION.PROPERTIES.defunct",
  },
};
Object.defineProperty(LOCATION_PROPERTIES, "toOptions", {
  get: function() {return Object.entries(this).map(([k, v]) => ({ value: k, label: v.label })); },
  enumerable: false,
});
dnd5e.utils.preLocalize("LOCATION_PROPERTIES", { keys: ["label"] });

/* -------------------------------------------------- */

/**
 * Selectable gender for a relation.
 * @enum {string}
 */
export const RELATION_GENDERS = {
  male: "QUESTBOARD.RELATION.GENDERS.male",
  female: "QUESTBOARD.RELATION.GENDERS.female",
  other: "QUESTBOARD.RELATION.GENDERS.other",
  none: "QUESTBOARD.RELATION.GENDERS.none",
};
dnd5e.utils.preLocalize("RELATION_GENDERS");
