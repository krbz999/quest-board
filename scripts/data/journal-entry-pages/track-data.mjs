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
          min: new NumberField({ min: 0, step: 1, nullable: false, initial: 0 }),
          max: new NumberField({ min: 1, step: 1, nullable: false, initial: 20 }),
          value: new NumberField({ min: 0, step: 1, nullable: false, initial: 0 }),
        }),
      }), { validateKey: key => foundry.data.validators.isValidId(key) }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    for (const [k, v] of Object.entries(this.counters)) {
      if (v.config.min >= v.config.max) v.config.min = 0;
      v.config.value = Math.clamp(v.config.value, v.config.min, v.config.max);
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user);
    if (allowed === false) return false;
    for (const counterId of options.counterIds ?? []) {
      const app = this.parent.apps[`${this.parent.uuid.replaceAll(".", "-")}-Counter-${counterId}`];
      if (app) {
        delete this.parent.apps[app.id];
        app.close();
      }
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
    ids = foundry.utils.getType(ids) === "string" ? [ids] : ids;
    const update = ids.reduce((acc, id) => {
      acc[`system.counters.-=${id}`] = null;
      return acc;
    }, {});
    return this.parent.update(update, { counterIds: ids });
  }
}
