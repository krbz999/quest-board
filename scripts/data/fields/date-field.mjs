const {
  NumberField, SchemaField,
} = foundry.data.fields;

export default class DateField extends SchemaField {
  constructor({ day, year, ...fields } = {}, options = {}) {
    super({
      day: new NumberField({ nullable: false, initial: 0, integer: true, min: 0, ...day }),
      year: new NumberField({ nullable: false, initial: 0, integer: true, min: 0, ...year }),
      ...fields,
    }, options);
  }
}
