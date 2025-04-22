const {
  NumberField, SchemaField,
} = foundry.data.fields;

export default class DateField extends SchemaField {
  constructor(fields, options) {
    super({
      day: new NumberField({ nullable: false, initial: 0, integer: true, min: 0 }),
      year: new NumberField({ nullable: false, initial: 0, integer: true, min: 0 }),
      ...fields,
    }, options);
  }
}
