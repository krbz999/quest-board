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
  prepareBaseData() {
    super.prepareBaseData();
    for (const [k, v] of Object.entries(this.counters)) {
      if (v.config.min >= v.config.max) v.config.min = 0;
      v.config.value = Math.clamp(v.config.value, v.config.min, v.config.max);
    }
  }

  /* -------------------------------------------------- */

  async createCounter(data = {}) {
    data = foundry.utils.mergeObject({ name: "" }, data);
    const id = foundry.utils.randomID();
    return this.parent.update({ [`system.counters.${id}`]: data });
  }

  /* -------------------------------------------------- */

  async deleteCounters(ids) {
    ids = foundry.utils.getType(ids) === "string" ? [ids] : ids;
    const update = ids.reduce((acc, id) => {
      acc[`system.counters.-=${id}`] = null;
      return acc;
    }, {});
    return this.parent.update(update);
  }
}
