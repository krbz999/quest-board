import TypedObjectModel from "./typed-object-model.mjs";

const {
  NumberField, SchemaField, StringField,
} = foundry.data.fields;

class PriceField extends SchemaField {
  constructor(fields = {}, options = {}) {
    super({
      value: new NumberField({ min: 0, step: 0.1 }),
      denomination: new StringField({
        required: true,
        blank: true,
        choices: CONFIG.DND5E.currencies,
      }),
      ...fields,
    }, options);
  }
}

/* -------------------------------------------------- */

export default class StockItem extends TypedObjectModel {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      price: new SchemaField({
        each: new PriceField(),
        stack: new PriceField(),
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get path() {
    return "system.stock";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async prepareEntryData() {
    const data = await super.prepareEntryData();
    if (!data) return data;

    data.pev = this.price.each.value ?? data.item.system.price.value;
    data.ped = this.price.each.denomination || data.item.system.price.denomination;
    data.psv = this.price.stack.value ?? (data.pev * data.quantity).toNearest(0.1);
    data.psd = this.price.stack.denomination || data.ped;

    return data;
  }
}
