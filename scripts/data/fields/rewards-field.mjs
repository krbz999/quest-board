export default class RewardsField extends foundry.data.fields.TypedObjectField {
  /** @inheritdoc */
  initialize(value) {
    value = super.initialize(value);
    const uuids = new Set();
    const collection = new foundry.utils.Collection();
    for (const [id, v] of Object.entries(value)) {
      if (!v.uuid || uuids.has(v.uuid)) delete value[id];
      else {
        const element = this.element.initialize(v);
        uuids.add(element.uuid);
        collection.set(element.id, element);
      }
    }
    return collection;
  }
}
