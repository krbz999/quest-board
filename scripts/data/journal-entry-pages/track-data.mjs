const {
  HTMLField, NumberField, SchemaField, StringField, TypedObjectField,
} = foundry.data.fields;

export default class TrackData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      counters: new TypedObjectField(new SchemaField({
        name: new StringField({ required: true }),
        description: new HTMLField(),
        config: new SchemaField({
          max: new NumberField({ min: 1, step: 1, nullable: true, initial: null }),
          value: new NumberField({ min: 0, step: 1, nullable: true, initial: null }),
        }),
      }), { validateKey: key => foundry.data.validators.isValidId(key) }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.TRACK"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    for (const [k, v] of Object.entries(this.counters)) {
      v.config.max ??= 20;
      v.config.value = Math.clamp(v.config.value, 0, v.config.max);
      v.config.spent = Math.clamp(v.config.max - v.config.value, 0, v.config.max);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Create a new counter on the page.
   * @param {object} [data]                 Counter data.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async createCounter(data = {}) {
    data = foundry.utils.mergeObject({ name: "" }, data);
    const id = foundry.utils.randomID();
    return this.parent.update({ [`system.counters.${id}`]: data });
  }

  /* -------------------------------------------------- */

  /**
   * Delete a counter from the page.
   * @param {string|string[]} ids           An id or array of ids of counters to delete.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async deleteCounters(ids) {
    ids = (foundry.utils.getType(ids) === "string") ? [ids] : ids;
    const update = ids.reduce((acc, id) => {
      acc[`system.counters.-=${id}`] = null;
      return acc;
    }, {});
    return this.parent.update(update);
  }
}
