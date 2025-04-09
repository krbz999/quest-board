export default class StockField extends foundry.data.fields.TypedObjectField {
  /** @inheritdoc */
  initialize(value) {
    value = super.initialize(value);
    const collection = new foundry.utils.Collection();
    for (const [k, v] of Object.entries(value)) {
      if (v.uuid) collection.set(k, v);
    }
    return collection;
  }
}
