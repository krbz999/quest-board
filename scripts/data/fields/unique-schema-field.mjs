/**
 * A subclass of SetField that ensures that the contained elements do not have overlapping uuids.
 * @extends {SetField}
 */
export default class UniqueSchemaField extends foundry.data.fields.SetField {
  /** @inheritdoc */
  initialize(value) {
    value = super.initialize(value);
    const uuids = new Set();
    for (const v of value) {
      if (!v.uuid || uuids.has(v.uuid)) value.delete(v);
      else uuids.add(v.uuid);
    }
    return value;
  }
}
