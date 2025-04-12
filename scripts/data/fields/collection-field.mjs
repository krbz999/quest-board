export default class CollectionField extends foundry.data.fields.TypedObjectField {
  /** @inheritdoc */
  constructor(model) {
    super(new foundry.data.fields.EmbeddedDataField(model));
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  initialize(value, model, options = {}) {
    value = super.initialize(value, model, options);
    const collection = new foundry.utils.Collection();
    for (const [id, v] of Object.entries(value)) {
      const element = this.element.initialize({ ...v, _id: id }, model, options);
      collection.set(element.id, element);
    }
    return collection;
  }
}
