export default class StockField extends foundry.data.fields.TypedObjectField {
  /** @inheritdoc */
  initialize(value) {
    value = super.initialize(value);
    const uuids = new Set();
    for (const [id, v] of Object.entries(value)) {
      if (!v.uuid || uuids.has(v.uuid)) delete value[id];
      else uuids.add(v.uuid);
    }
    return value;
  }
}
